ym.modules.define('shri2017.imageViewer.EventManager', [
    'shri2017.imageViewer.PointerCollection',
    'util.extend'
], function (provide, PointerCollection, extend) {

    var EVENTS = {
        mousedown: 'start',
        mousemove: 'move',
        mouseup: 'end',

        touchstart: 'start',
        touchmove: 'move',
        touchend: 'end',
        touchcancel: 'end',

        pointerdown: 'start',
        pointermove: 'move',
        pointerup: 'end',
        pointercancel: 'end',

        wheel: 'wheel'
    };

    function EventManager(elem, callback) {
        this._elem = elem;
        this._callback = callback;
        this._pointers = null;
        this._setupListeners();
    }

    extend(EventManager.prototype, {
        destroy: function () {
            this._teardownListeners();
        },

        _setupListeners: function () {
            this._mouseListener = this._mouseEventHandler.bind(this);
            this._touchListener = this._touchEventHandler.bind(this);
            this._pointerListener = this._pointerEventHandler.bind(this);
            this._wheelListener = this._wheelEventHandler.bind(this);

            this._addEventListeners('pointerdown', this._elem, this._pointerListener);
            this._addEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._touchListener);
            this._addEventListeners('mousedown', this._elem, this._mouseListener);
            this._addEventListeners('wheel', this._elem, this._wheelListener);
        },

        _teardownListeners: function () {
            this._removeEventListeners('mousedown', this._elem, this._mouseListener);
            this._removeEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
            this._removeEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._touchListener);
            this._removeEventListeners('pointerdown pointermove pointerup pointercancel', this._elem, this._pointerListener);
        },

        _addEventListeners: function (types, elem, callback) {
            types.split(' ').forEach(function (type) {
                elem.addEventListener(type, callback);
            }, this);
        },

        _removeEventListeners: function (types, elem, callback) {
            types.split(' ').forEach(function (type) {
                elem.removeEventListener(type, callback);
            }, this);
        },

        _pointerEventsEnabled: function () {
            return window.PointerEvent;
        },

        _mouseEventHandler: function (event) {
            event.preventDefault();

            if (event.type === 'mousedown') {
                this._addEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
            } else if (event.type === 'mouseup') {
                this._removeEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
            }

            var elemOffset = this._calculateElementOffset(this._elem);

            this._callback({
                type: EVENTS[event.type],
                pointerType: 'mouse',
                targetPoint: {
                    x: event.clientX - elemOffset.x,
                    y: event.clientY - elemOffset.y
                },
                distance: 1
            });
        },

        _wheelEventHandler: function (event) {
            event.preventDefault();

            var elemOffset = this._calculateElementOffset(this._elem);
            var distance = event.deltaY > 0 ? 1 : -1;

            this._callback({
                type: EVENTS[event.type],
                pointerType: 'mouse',
                targetPoint: {
                    x: event.clientX - elemOffset.x,
                    y: event.clientY - elemOffset.y
                },
                distance: distance
            });
        },

        _touchEventHandler: function (event) {
            event.preventDefault();

            if (this._pointerEventsEnabled()) {
                return;
            }

            var touches = event.touches;
            // touchend/touchcancel
            if (touches.length === 0) {
                touches = event.changedTouches;
            }

            var targetPoint;
            var distance = 1;
            var elemOffset = this._calculateElementOffset(this._elem);

            if (touches.length === 1) {
                targetPoint = {
                    x: touches[0].clientX,
                    y: touches[0].clientY
                };
            } else {
                var firstTouch = touches[0];
                var secondTouch = touches[1];
                targetPoint = this._calculateTargetPoint(firstTouch, secondTouch);
                distance = this._calculateDistance(firstTouch, secondTouch);
            }

            targetPoint.x -= elemOffset.x;
            targetPoint.y -= elemOffset.y;

            this._callback({
                type: EVENTS[event.type],
                pointerType: 'touch',
                targetPoint: targetPoint,
                distance: distance
            });
        },

        _pointerEventHandler: function (event) {
            event.preventDefault();

            if (!this._pointers) {
                this._pointers = new PointerCollection();
            }

            if (event.type === 'pointerdown') {
                this._onPointerDown(event);
            } else if (event.type === 'pointermove') {
                this._onPointerMove(event);
            } else if (event.type === 'pointerup' || event.type === 'pointercancel') {
                this._onPointerUp(event);
            }

            var distance = 1;
            var targetPoint, firstPoint, secondPoint;
            var pointersCount = this._pointers.getPointersCount();
            var elemOffset = this._calculateElementOffset(this._elem);

            if (pointersCount > 1) {
                firstPoint = this._pointers.getPointer(0);
                secondPoint = this._pointers.getPointer(1);
                targetPoint = this._calculateTargetPoint(firstPoint, secondPoint);
                distance = this._calculateDistance(firstPoint, secondPoint);
            } else {
                firstPoint = pointersCount === 0 ? event : this._pointers.getPointer(0);
                targetPoint = {
                    x: firstPoint.clientX,
                    y: firstPoint.clientY
                };
            }

            targetPoint.x -= elemOffset.x;
            targetPoint.y -= elemOffset.y;

            this._callback({
                type: EVENTS[event.type],
                pointerType: event.pointerType,
                targetPoint: targetPoint,
                distance: distance
            });
        },

        _onPointerDown: function (event) {
            if (!this._pointers.exists(event)) {
                this._pointers.add(event);
            }

            if (this._pointers.getPointersCount() === 1) {
                this._addEventListeners('pointermove pointerup pointercancel', document.documentElement, this._pointerListener);
                this._elem.style.touchAction = 'none';
            }
        },

        _onPointerMove: function (event) {
            if (this._pointers.exists(event)) {
                this._pointers.update(event);
            }
        },

        _onPointerUp: function (event) {
            if (this._pointers.exists(event)) {
                this._pointers.remove(event);
            }

            if (this._pointers.getPointersCount() === 0)  {
                this._removeEventListeners('pointermove pointerup pointercancel', document.documentElement, this._pointerListener);
                this._elem.style.touchAction = '';
            }
        },

        _calculateTargetPoint: function (firstTouch, secondTouch) {
            return {
                x: (secondTouch.clientX + firstTouch.clientX) / 2,
                y: (secondTouch.clientY + firstTouch.clientY) / 2
            };
        },

        _calculateDistance: function (firstTouch, secondTouch) {
            return Math.sqrt(
                Math.pow(secondTouch.clientX - firstTouch.clientX, 2) +
                Math.pow(secondTouch.clientY - firstTouch.clientY, 2)
            );
        },

        _calculateElementOffset: function (elem) {
            var bounds = elem.getBoundingClientRect();
            return {
                x: bounds.left,
                y: bounds.top
            };
        }
    });

    provide(EventManager);
});
