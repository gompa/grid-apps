/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

(function() {

    let KIRI = self.kiri,
        BASE = self.base,
        UTIL = BASE.util,
        FDM = KIRI.driver.FDM,
        SPACE, API,
        p1, p2, iw,
        alert = [],
        func = {};

    FDM.init = function(kiri, api) {
        API = api;
        SPACE = api.const.SPACE;
        api.event.on("mode.set", mode => {
            if (mode !== 'FDM') {
                clearAllWidgetSupports();
            }
        });
        api.event.on("settings.load", (settings) => {
            if (settings.mode !== 'FDM') return;
            settings.process.outputOriginCenter = (settings.device.originCenter || false);
            restoreSupports(api.widgets.all());
        });
        api.event.on("settings.saved", (settings) => {
            let proc = settings.process;
            api.ui.fdmSupport.marker.style.display = proc.sliceSupportEnable ? 'flex' : 'none';
        });
        api.event.on("button.click", target => {
            switch (target) {
                case api.ui.ssmAdd:
                    return func.sadd();
                case api.ui.ssmDun:
                    return func.sdone();
                case api.ui.ssmClr:
                    api.uc.confirm("clear supports?").then(ok => {
                        if (ok) func.sclear();
                    });
                    break;
            }
        });
        api.event.on("fdm.supports.add", func.sadd = () => {
            alert = api.show.alert("&lt;esc&gt; key when done editing supports");
            api.feature.hover = true;
        });
        api.event.on("fdm.supports.done", func.sdone = () => {
            delbox('intZ');
            delbox('intW');
            api.hide.alert(alert);
            api.feature.hover = false;
        });
        api.event.on("fdm.supports.clear", func.sclear = () => {
            func.sdone();
            clearAllWidgetSupports();
            API.conf.save();
        });
        api.event.on("key.esc", () => {
            func.sdone()
        });
        // api.event.on("selection.rotate", (x,y,z) => {
        //     console.log('rotate', x,y,z);
        // });
        api.event.on("mouse.hover.up", int => {
            delbox('supp');
            if (!iw) return;
            let hy = (p1.y + p2.y) / 2;
            let dh = Math.abs(p1.y - p2.y);
            let dw = api.conf.get().process.sliceSupportSize / 2;
            let ip = iw.track.pos;
            let wa = api.widgets.annotate(iw.id);
            let ws = (wa.support = wa.support || []);
            let x = p1.x - ip.x, y = -p1.z - ip.y, z = hy;
            let id = Date.now();
            ws.push({x, y, z, dw, dh, id});
            addWidgetSupport(iw, {x, y, z, dw, dh, id});
            API.conf.save();
        });
        api.event.on("mouse.hover", data => {
            const { int, type, point } = data;
            if (int && type === 'widget') {
                iw = int.object.widget || iw;
            } else {
                iw = null;
            }
            // delbox('intZ');
            // delbox('intW');
            // addbox(point, 0xff0000, 'intZ');
            delbox('supp');
            p1 = point;
            let dir = new THREE.Vector3(0,1,0)
            let ray = new THREE.Raycaster(point, dir);
            // when on object, project down on downward faces
            if (int && int.face && int.face.normal.z < -0.1) {
                dir.y = -1;
            }
            let targets = api.widgets.meshes().append(SPACE.internals().platform);
            let i2 = ray.intersectObjects(targets, false);
            if (i2 && i2.length > 0) {
                // prevent false matches close to origin of ray
                i2 = i2.filter(i => i.distance > 0.01);
                // prevent single point base to top matches
                if (i2.length > 1) {
                    p2 = i2[0].point;
                    iw = i2[0].object.widget || iw;
                    let hy = (p1.y + p2.y) / 2;
                    let dy = Math.abs(p1.y - p2.y);
                    let dw = api.conf.get().process.sliceSupportSize / 2;
                    // addbox(p2, 0x00ff00, 'intW');
                    addbox({x:p1.x, y:hy, z:p1.z}, 0x0000dd, 'supp', {
                        x:dw, y:dw, z:dy
                    });
                }
            }
        });
    }

    function restoreSupports(widgets) {
        widgets.forEach(widget => {
            const supports = API.widgets.annotate(widget.id).support || [];
            supports.forEach(pos => {
                addWidgetSupport(widget, pos);
            });
        });
    }

    function addWidgetSupport(widget, pos) {
        const { x, y, z, dw, dh, id } = pos;
        const sups = widget.sups = (widget.sups || {});
        // prevent duplicate restore from repeated settings load calls
        if (!sups[id]) {
            pos.box = addbox({x, y, z}, 0x0000dd, 'supp', { x:dw, y:dw, z:dh }, widget.mesh);
            sups[id] = pos;
        }
    }

    function clearAllWidgetSupports() {
        API.widgets.all().forEach(widget => {
            clearWidgetSupports(widget);
        });
    }

    function clearWidgetSupports(widget) {
        Object.values(widget.sups || {}).forEach(support => {
            widget.mesh.remove(support.box);
        });
        delete API.widgets.annotate(widget.id).support;
    }

    function delbox(name, group) {
        const old = SPACE[`__${name}`];
        if (old) {
            (group || SPACE.scene).remove(old);
        }
    }

    function addbox(point, color, name, dim = {x:1,y:1,z:1}, group) {
        delbox(name);
        name = `__${name}`;
        const box = SPACE[name] = new THREE.Mesh(
            new THREE.BoxGeometry(dim.x, dim.y, dim.z),
            new THREE.MeshPhongMaterial({
                transparent: true,
                opacity: 0.5,
                color
            })
        );
        box.position.x = point.x;
        box.position.y = point.y;
        box.position.z = point.z;
        (group || SPACE.scene).add(box);
        return box;
    }

})();
