QUnit.config.reorder = false;

Muuri.syncPacker = new Muuri.Packer();
Muuri.asyncPacker = Muuri.defaultPacker;
Muuri.defaultPacker = Muuri.syncPacker;
