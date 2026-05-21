import fs from 'fs';

export function format(): void {
  const map = JSON.parse(fs.readFileSync('./assets/maps/map.json', 'utf8'));

  const layers = map.layers.filter((l: any) => l.type === 'tilelayer');
  const tilewidth = map.tilewidth;
  const tileheight = map.tileheight;
  const width = map.width;
  const height = map.height;

  // flatten layers
  const collisionGrid: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let tile = 0;
      for (const layer of layers) {
        const t = layer.data[y * width + x];
        if (t > 0) tile = t;
      }
      row.push(tile);
    }
    collisionGrid.push(row);
  }

  // Build server map
  const serverMap = {
    width,
    height,
    tilewidth,
    tileheight,
    layers: [{ data: collisionGrid.flat(), type: 'tilelayer' }],
    tilesets: map.tilesets,
  };

  // Build client map (same structure but maybe optimized)
  const clientMap = {
    width,
    height,
    tilewidth,
    tileheight,
    layers: map.layers.filter((l: any) => l.type === 'tilelayer' || l.type === 'objectgroup'),
    tilesets: map.tilesets,
  };

  fs.writeFileSync('./assets/maps/minimap_server.json', JSON.stringify(serverMap));
  fs.writeFileSync('./assets/maps/minimap_client.json', JSON.stringify(clientMap));
  console.log('Map formatted');
}
