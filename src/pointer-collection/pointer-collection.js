ym.modules.define('shri2017.imageViewer.PointerCollection', [
    'util.extend',
    'util.objectKeys'
], function (provide, extend, objectKeys) {

    var PointerCollection = function () {
        this._pointers = {};
    };

    extend(PointerCollection.prototype, {
        add: function (event) {
            this._pointers[event.pointerId] = event;
        },

        update: function (event) {
            this.add(event);
        },

        remove: function (event) {
            delete this._pointers[event.pointerId];
        },

        exists: function (event) {
            return this._pointers.hasOwnProperty(event.pointerId);
        },

        getPointersCount: function () {
            return objectKeys(this._pointers).length;
        },

        getPointer: function (index) {
            var pointersId = objectKeys(this._pointers);
            return this._pointers[pointersId[index]];
        }
    });

    provide(PointerCollection);
});
