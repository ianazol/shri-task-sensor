ym.modules.define('shri2017.imageViewer.GestureController', [
    'shri2017.imageViewer.EventManager'
], function (provide, EventManager) {

    var DBL_TAB_STEP = 0.2;
    var WHEEL_SCALE_STEP = 0.005;
    var MAX_SCALE = 2;
    var MIN_SCALE = 0.01;

    var Controller = function (view) {
        this._view = view;
        this._eventManager = new EventManager(
            this._view.getElement(),
            this._eventHandler.bind(this)
        );
        this._lastEventTypes = '';
        this._dblClickStarted = false;
        this._clickCounter = 0;
    };

    Object.assign(Controller.prototype, {
        destroy: function () {
            this._eventManager.destroy();
        },

        _eventHandler: function (event) {
            var state = this._view.getState();

            // dbclick
            // в предыдущей реализации на сенсорном устройстве с поддержкой pointerEvents
            // между start и end приходили события move
            // и фактически жест dbltap никогда не срабатывал
            if (event.type === 'start' && !this._dblClickStarted) {
                this._dblClickStarted = true;
                setTimeout(this._endDblClick.bind(this), 400);
            }

            if (this._dblClickStarted) {
                if (event.type === 'end') {
                    this._clickCounter++;
                }
                if (this._clickCounter === 2) {
                    this._endDblClick();
                    this._processDbltab(event);
                    return;
                }
            }

            if (event.type === 'wheel') {
                this._processWheel(event);
                return;
            }

            if (event.type === 'move') {
                if (event.distance > 1 && event.distance !== this._initEvent.distance) {
                    this._processMultitouch(event);
                } else {
                    this._processDrag(event);
                }
            } else {
                this._initState = this._view.getState();
                this._initEvent = event;
            }
        },

        _processDrag: function (event) {
            this._view.setState({
                positionX: this._initState.positionX + (event.targetPoint.x - this._initEvent.targetPoint.x),
                positionY: this._initState.positionY + (event.targetPoint.y - this._initEvent.targetPoint.y)
            });
        },

        _processMultitouch: function (event) {
            this._scale(
                event.targetPoint,
                this._initState.scale * (event.distance / this._initEvent.distance)
            );
        },

        _processWheel: function (event) {
            var state = this._view.getState();
            this._scale(
                event.targetPoint,
                state.scale + (event.distance * WHEEL_SCALE_STEP)
            );
        },

        _processDbltab: function (event) {
            var state = this._view.getState();
            this._scale(
                event.targetPoint,
                state.scale + DBL_TAB_STEP
            );
        },

        _scale: function (targetPoint, newScale) {
            var imageSize = this._view.getImageSize();
            var state = this._view.getState();
            // Позиция прикосновения на изображении на текущем уровне масштаба
            var originX = targetPoint.x - state.positionX;
            var originY = targetPoint.y - state.positionY;
            // Размер изображения на текущем уровне масштаба
            var currentImageWidth = imageSize.width * state.scale;
            var currentImageHeight = imageSize.height * state.scale;
            // Относительное положение прикосновения на изображении
            var mx = originX / currentImageWidth;
            var my = originY / currentImageHeight;
            // Размер изображения с учетом нового уровня масштаба
            var newImageWidth = imageSize.width * newScale;
            var newImageHeight = imageSize.height * newScale;
            // Проверяем на допустимое значение масштаба
            newScale = newScale < MIN_SCALE ? MIN_SCALE : newScale;
            newScale = newScale > MAX_SCALE ? MAX_SCALE : newScale;
            if (newScale === state.scale) {
                return;
            }
            // Рассчитываем новую позицию с учетом уровня масштаба
            // и относительного положения прикосновения
            state.positionX += originX - (newImageWidth * mx);
            state.positionY += originY - (newImageHeight * my);
            // Устанавливаем текущее положение мышки как "стержневое"
            state.pivotPointX = targetPoint.x;
            state.pivotPointY = targetPoint.y;
            // Устанавливаем масштаб и угол наклона
            state.scale = newScale;
            this._view.setState(state);
        },

        _endDblClick: function () {
            this._clickCounter = 0;
            this._dblClickStarted = false;
        }
    });

    provide(Controller);
});
