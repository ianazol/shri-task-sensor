ym.modules.define('shri2017.imageViewer.GestureController', [
    'shri2017.imageViewer.EventManager',
    'util.extend'
], function (provide, EventManager, extend) {

    var DBL_TAP_STEP = 0.2;
    var ONE_TOUCH_ZOOM_STEP = 0.01;
    var WHEEL_SCALE_STEP = 0.005;
    var MAX_SCALE = 2;
    var MIN_SCALE = 0.05;

    var Controller = function (view) {
        this._view = view;
        this._eventManager = new EventManager(
            this._view.getElement(),
            this._eventHandler.bind(this)
        );
        this._dblClickStarted = false;
        this._oneAndHalfClick = false;
        this._oneTouchZoomStarted = false;
        this._clickCounter = 0;
    };

    extend(Controller.prototype, {
        destroy: function () {
            this._eventManager.destroy();
        },

        _eventHandler: function (event) {
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
                    this._oneAndHalfClick = false;
                    this._processDbltap(event);
                    return;
                }
            }

            // oneTouchZoom
            if (event.pointerType === 'touch') {
                if (event.type === 'start' && this._clickCounter === 1) {
                    this._lastEvent = this._initEvent = event;
                    this._oneAndHalfClick = true;
                }

                // отловлен полуторный тап
                if (this._oneAndHalfClick) {
                    if (event.type === 'end') {
                        this._oneAndHalfClick = false;
                    }

                    // т.к на сенсорных устройствах между start и end при dbltap могут приходить move
                    // проверяем на сколько сместился указатель.
                    // Если больше, чем на 5 единиц, то признаем,
                    // что это намеренный жест
                    if (event.type === 'move' && event.distance === 1 && !this._oneTouchZoomStarted) {
                        var diff = event.targetPoint.y - this._lastEvent.targetPoint.y;
                        if (Math.abs(diff) > 5) {
                            this._oneTouchZoomStarted = true;
                        }
                    }
                }

                if (this._oneTouchZoomStarted) {
                    if (event.type === 'end') {
                        this._oneTouchZoomStarted = false;
                    }

                    if (event.type === 'move') {
                        this._processOneTouchZoom(event);
                        this._lastEvent = event;
                        return;
                    }
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

        _processOneTouchZoom: function (event) {
            var state = this._view.getState();
            var diff = event.targetPoint.y - this._lastEvent.targetPoint.y;
            var direction = (diff > 0) ? 1 : -1;

            this._scale(
                this._initEvent.targetPoint,
                state.scale + (direction * ONE_TOUCH_ZOOM_STEP)
            );
        },

        _processDbltap: function (event) {
            var state = this._view.getState();
            this._scale(
                event.targetPoint,
                state.scale + DBL_TAP_STEP
            );
        },

        _scale: function (targetPoint, newScale) {
            var imageSize = this._view.getImageSize();
            var state = this._view.getState();
            // Проверяем на допустимое значение масштаба
            newScale = Math.max(Math.min(newScale, MAX_SCALE), MIN_SCALE);
            if (newScale === state.scale) {
                return;
            }
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
