/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

(function() {

// dep: ext.three
// dep: ext.three-bgu
gapp.register("mesh.api", [
    "moto.license", // dep: moto.license
    "moto.client",  // dep: moto.client
    "moto.space",   // dep: moto.space
    "mesh.tool",    // dep: mesh.tool
    "add.array",    // dep: add.array
]);

let mesh = self.mesh = self.mesh || {};
if (mesh.api) return;

let space = moto.Space;
let groups = [];
let selected = [];

let selection = {
    // @returns {MeshObject[]}
    list() {
        return selected.slice();
    },

    // @param group {MeshObject[]}
    set(objects) {
        selected = objects;
        this.update();
    },

    // @param group {MeshObject}
    add(object) {
        selected.addOnce(object);
        this.update();
    },

    toggle(object) {
        selected.remove(object) || selected.addOnce(object);
        this.update();
    },

    // @param group {MeshObject}
    remove(object) {
        selected.remove(object);
        this.update();
    },

    clear() {
        selected = [];
        this.update();
    },

    update() {
        for (let group of groups) {
            group.material(mesh.material.unselected);
        }
        for (let object of selected) {
            object.material(mesh.material.selected);
        }
    },

    move(dx = 0, dy = 0, dz = 0) {
        for (let s of selected) {
            s.move(dx, dy, dz);
        }
        return selection;
    },

    rotate(dx = 0, dy = 0, dz = 0) {
        for (let s of selected) {
            s.rotate(dx, dy, dz);
        }
        return selection;
    },

    scale(dx = 0, dy = 0, dz = 0) {
        for (let s of selected) {
            let { x, y, z } = s.scale();
            s.scale(x + dx, y + dy, z + dz);
        }
        return selection;
    },

    floor() {
        for (let s of selected) {
            s.floor(...arguments);
        }
        return selection;
    },

    centerXY() {
        for (let s of selected) {
            s.centerXY(...arguments);
        }
        return selection;
    },

    home() {
        return selection.centerXY().floor();
    },

    focus() {
        api.focus(selected);
    },

    bounds() {
        return util.bounds(selected.map(s => s.object()));
    }
};

let group = {
    // @returns {MeshGroup[]}
    list() {
        return groups.slice();
    },

    // @param group {MeshModel[]}
    new: (models) => {
        return group.add(new mesh.group(models));
    },

    // @param group {MeshGroup}
    add: (group) => {
        groups.addOnce(group);
        space.world.add(group.group);
        space.update();
        selection.set([group]);
        return group;
    },

    // @param group {MeshGroup}
    remove: (group) => {
        groups.remove(group);
        space.world.remove(group.group);
        space.update();
    }
};

let api = mesh.api = {
    clear: () => {
        for (let group of group.list()) {
            group.remove(group);
        }
    },

    // @param object {THREE.Object3D | THREE.Object3D[]}
    focus: (object) => {
        let { center } = util.bounds(object);
        // when no valid objects supplied, set origin
        if (isNaN(center.x * center.y * center.z)) {
            center = { x: 0, y: 0, z: 0 };
        }
        // sets "home" views (front, back, home, reset)
        space.platform.setCenter(center.x, center.y, center.z);
        // sets camera focus
        space.view.setFocus(new THREE.Vector3(
            center.x, center.z, center.y
        ));
    },

    selection,

    group,

    model: {
        // @returns {MeshModel[]}
        list() {
            return groups.map(g => g.models).flat();
        },

        // @param group {MeshModel}
        remove: (model) => {
            model.group.remove(model);
        }
    },

    objects: () => {
        return group.list().map(o => o.models).flat().map(o => o.object());
    }
};

let util = mesh.util = {

    // @param object {THREE.Object3D | THREE.Object3D[] | MeshObject | MeshObject[]}
    // @returns bounds modified for moto.Space
    bounds: (object) => {
        let box = new THREE.Box3();
        if (Array.isArray(object)) {
            for (let o of object) {
                box.union(new THREE.Box3().setFromObject(
                    o instanceof mesh.object ? o.object() : o
                ));
            }
        } else if (object) {
            box.setFromObject(
                object instanceof mesh.object ? object.object() : object);
        } else {
            return box;
        }
        let bnd = {
            min: {
                x: box.min.x,
                y: box.min.z,
                z: box.min.y
                },
            max: {
                x: box.max.x,
                y: box.max.z,
                z: box.max.y
            }
        };
        bnd.size = {
            x: bnd.max.x - bnd.min.x,
            y: bnd.max.y - bnd.min.y,
            z: bnd.max.z - bnd.min.z
        };
        bnd.center = {
            x: (bnd.max.x + bnd.min.x) / 2,
            y: (bnd.max.y + bnd.min.y) / 2,
            z: (bnd.max.z + bnd.min.z) / 2
        };
        return bnd;
    }

};

})();
