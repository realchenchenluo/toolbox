(function (root) {
  'use strict';
  // Atlas files reduce package entries; every displayed src is still one complete 32px sheep.
  var rows = {idle:[0,2],walk:[1,4],sit:[2,2],eat:[3,3],drink:[4,3],lie:[5,2],sleep:[6,2]};
  var cache = Object.create(null);
  function load(prefix) {
    if (cache[prefix]) return cache[prefix];
    var entry = cache[prefix] = {frames:Object.create(null),status:'loading'};
    var image = document.createElement('img');
    image.onload = function () {
      try {
        if (image.naturalWidth !== 128 || image.naturalHeight !== 224) throw new Error('invalid sheep sheet');
        var canvas = document.createElement('canvas');canvas.width=32;canvas.height=32;
        var context = canvas.getContext('2d');if(!context) throw new Error('canvas unavailable');
        context.imageSmoothingEnabled=false;
        Object.keys(rows).forEach(function (pose) {
          var row=rows[pose];
          for(var frame=0;frame<row[1];frame+=1){
            context.clearRect(0,0,32,32);
            context.drawImage(image,frame*32,row[0]*32,32,32,0,0,32,32);
            entry.frames[pose+'-'+frame]=canvas.toDataURL('image/png');
          }
        });
        entry.status='ready';
      } catch(error) {entry.frames=Object.create(null);entry.status='fallback';}
      image.onload=null;image.onerror=null;
    };
    image.onerror=function(){entry.status='fallback';image.onload=null;image.onerror=null;};
    image.src=prefix+'-sequence.png';
    return entry;
  }
  function resolve(path) {
    var match=/^(\.\/assets\/sheep\/(?:young|adult)-(?:normal|gift|mint|peach|wish|rainbow)-(?:wool|shorn))-(idle|walk|sit|eat|drink|lie|sleep)-([0-3])\.png$/.exec(path);
    if(!match)return path;
    var entry=load(match[1]);
    return entry.frames[match[2]+'-'+match[3]] || match[1]+'-idle.png';
  }
  root.FarmSheepFrames={resolve:resolve,preload:load};
}(window));
