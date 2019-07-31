//.  app.js
var express = require( 'express' ),
    Canvas = require( 'canvas' ),
    cfenv = require( 'cfenv' ),
    multer = require( 'multer' ),
    bodyParser = require( 'body-parser' ),
    easyimg = require( 'easyimage' ),
    ejs = require( 'ejs' ),
    fs = require( 'fs' ),
    settings = require( './settings' ),
    app = express(),
    Image = Canvas.Image,
    upload = multer({ dest: './tmp/' } );

app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.Router() );
//app.use( express.static( __dirname + '/public' ) );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

var threshhold = settings.threshhold; // 30 でないと色の違いに気付けない？

app.get( '/', function( req, res ){
  res.render( 'index', { settings: settings } );
});

app.post( '/upload', upload.array('images'), function( req, res ){
  res.contentType( 'application/json' );
  if( req.files ){
    var path1 = req.files[0].path;
    var type1 = req.files[0].mimetype;
    var filename1 = req.files[0].originalname;
    var path2 = req.files[1].path;
    var type2 = req.files[1].mimetype;
    var filename2 = req.files[1].originalname;
    //var lat = ( req.body.lat ? parseFloat( req.body.lat ) : 0.0 );

    //. 画像のサイズ変換
    var path01 = path1 + '_0';
    var option1 = { src: path1, dst: path01, width: settings.image_size, height: settings.image_size, ignoreAspectRatio: true };
    easyimg.resize( option1 ).then(
      function( file1 ){
        var width1 = file1.width;
        var height1 = file1.height;
        //console.log( 'width1 = ' + width1 + ', height1 = ' + height1 );

        var img1 = new Image;
        img1.src = path01;
        var canvas1 = new Canvas.createCanvas( img1.width, img1.height );
        var ctx1 = canvas1.getContext( '2d' );
        ctx1.drawImage( img1, 0, 0, img1.width, img1.height );
        var imagedata1 = ctx1.getImageData( 0, 0, img1.width, img1.height );
        //console.log( 'imagedata1.width = ' + imagedata1.width + ', imagedata1.height = ' + imagedata1.height );

        var path02 = path2 + '_0';
        var option2 = { src: path2, dst: path02, width: settings.image_size, height: settings.image_size, ignoreAspectRatio: true };
        easyimg.resize( option2 ).then(
          function( file2 ){
            var width2 = file2.width;
            var height2 = file2.height;
            //console.log( 'width2 = ' + width2 + ', height2 = ' + height2 );

            var img2 = new Image;
            img2.src = path02;
            var canvas2 = new Canvas.createCanvas( img2.width, img2.height );
            var ctx2 = canvas2.getContext( '2d' );
            ctx2.drawImage( img2, 0, 0, img2.width, img2.height );
            var imagedata2 = ctx2.getImageData( 0, 0, img2.width, img2.height );
            //console.log( 'imagedata2.width = ' + imagedata2.width + ', imagedata2.height = ' + imagedata2.height );

            //. 比較
            var results = [];
            for( var y = 0; y < imagedata1.height; y ++ ){
              var tmp = [];
              for( var x = 0; x < imagedata1.width; x ++ ){
                var idx = ( y * imagedata1.width + x ) * 4;

                var R1 = imagedata1.data[idx];
                var G1 = imagedata1.data[idx+1];
                var B1 = imagedata1.data[idx+2];
                var A1 = imagedata1.data[idx+3];
                var R2 = imagedata2.data[idx];
                var G2 = imagedata2.data[idx+1];
                var B2 = imagedata2.data[idx+2];
                var A2 = imagedata2.data[idx+3];

                if( Math.abs( R1 - R2 ) > threshhold
                  || Math.abs( G1 - G2 ) > threshhold
                  || Math.abs( B1 - B2 ) > threshhold
                  //|| Math.abs( A1 - A2 ) > threshhold
                ){
                  tmp.push( 1 );
                }else{
                  tmp.push( 0 );
                }
              }
              results.push( tmp );
            }

            //. この時点で results は image_resize x image_resize の２次配列になっている

            var results = shapenResults( results );
            /*
            var _results = JSON.parse( JSON.stringify( results ) );
            //. 周囲８ピクセル中、８ピクセルが 1 のもののみ残す  <-- まだ不充分
            for( var y = 1; y < results.length - 1; y ++ ){
              for( var x = 1; x < results[y].length - 1; x ++ ){
                var n = 0;
                if( results[y-1][x-1] == 1 ){ n ++; }
                if( results[y-1][x] == 1 ){ n ++; }
                if( results[y-1][x+1] == 1 ){ n ++; }
                if( results[y][x-1] == 1 ){ n ++; }
                if( results[y][x+1] == 1 ){ n ++; }
                if( results[y+1][x-1] == 1 ){ n ++; }
                if( results[y+1][x] == 1 ){ n ++; }
                if( results[y+1][x+1] == 1 ){ n ++; }
                _results[y][x] = ( n > 6 ? 1 : 0 );
              }
            }
            for( var i = 0; i < results.length; i ++ ){
              _results[0][i] = 0;
              _results[results.length-1][i] = 0;
              _results[i][0] = 0;
              _results[i][results.length-1] = 0;
            }
            //. 周囲24ピクセル中、24ピクセルが 1 のもののみ残す
            for( var y = 2; y < results.length - 2; y ++ ){
              for( var x = 2; x < results[y].length - 2; x ++ ){
                var n = 0;
                if( results[y-2][x-2] == 1 ){ n ++; }
                if( results[y-2][x-1] == 1 ){ n ++; }
                if( results[y-2][x] == 1 ){ n ++; }
                if( results[y-2][x+1] == 1 ){ n ++; }
                if( results[y-2][x+2] == 1 ){ n ++; }
                if( results[y-1][x-2] == 1 ){ n ++; }
                if( results[y-1][x-1] == 1 ){ n ++; }
                if( results[y-1][x] == 1 ){ n ++; }
                if( results[y-1][x+1] == 1 ){ n ++; }
                if( results[y-1][x+2] == 1 ){ n ++; }
                if( results[y][x-2] == 1 ){ n ++; }
                if( results[y][x-1] == 1 ){ n ++; }
                if( results[y][x+1] == 1 ){ n ++; }
                if( results[y][x+2] == 1 ){ n ++; }
                if( results[y+1][x-2] == 1 ){ n ++; }
                if( results[y+1][x-1] == 1 ){ n ++; }
                if( results[y+1][x] == 1 ){ n ++; }
                if( results[y+1][x+1] == 1 ){ n ++; }
                if( results[y+1][x+2] == 1 ){ n ++; }
                if( results[y+2][x-2] == 1 ){ n ++; }
                if( results[y+2][x-1] == 1 ){ n ++; }
                if( results[y+2][x] == 1 ){ n ++; }
                if( results[y+2][x+1] == 1 ){ n ++; }
                if( results[y+2][x+2] == 1 ){ n ++; }
                _results[y][x] = ( n > 22 ? 1 : 0 );
              }
            }
            for( var i = 0; i < results.length; i ++ ){
              _results[0][i] = 0;
              _results[1][i] = 0;
              _results[results.length-2][i] = 0;
              _results[results.length-1][i] = 0;
              _results[i][0] = 0;
              _results[i][1] = 0;
              _results[i][results.length-2] = 0;
              _results[i][results.length-1] = 0;
            }

            results = JSON.parse( JSON.stringify( _results ) );
            */

            fs.unlink( path1, function(e){} );
            fs.unlink( path2, function(e){} );
            fs.unlink( path01, function(e){} );
            fs.unlink( path02, function(e){} );

            res.write( JSON.stringify( results, 2, null ) );
            res.end();
          },
          function( err ){
            fs.unlink( path1, function(e){} );
            fs.unlink( path2, function(e){} );
            fs.unlink( path01, function(e){} );

            res.status( 400 );
            res.write( JSON.stringify( err, 2, null ) );
            res.end();
          }
        );
      },
      function( err ){
        fs.unlink( path1, function(e){} );
        fs.unlink( path2, function(e){} );

        res.status( 400 );
        res.write( JSON.stringify( err, 2, null ) );
        res.end();
      }
    );
  }else{
    res.status( 400 );
    res.write( JSON.stringify( 'no files found.', 2, null ) );
    res.end();
  }
});

function shapenResults( results ){
  var _results = JSON.parse( JSON.stringify( results ) );

  //. 周囲８ピクセル中、８ピクセルが 1 のもののみ残す  <-- まだ不充分
  /*
  for( var y = 1; y < results.length - 1; y ++ ){
    for( var x = 1; x < results[y].length - 1; x ++ ){
      var n = 0;
      if( results[y-1][x-1] == 1 ){ n ++; }
      if( results[y-1][x] == 1 ){ n ++; }
      if( results[y-1][x+1] == 1 ){ n ++; }
      if( results[y][x-1] == 1 ){ n ++; }
      if( results[y][x+1] == 1 ){ n ++; }
      if( results[y+1][x-1] == 1 ){ n ++; }
      if( results[y+1][x] == 1 ){ n ++; }
      if( results[y+1][x+1] == 1 ){ n ++; }
      _results[y][x] = ( n > 6 ? 1 : 0 );
    }
  }
  for( var i = 0; i < results.length; i ++ ){
    _results[0][i] = 0;
    _results[results.length-1][i] = 0;
    _results[i][0] = 0;
    _results[i][results.length-1] = 0;
  }
  */
  //. 周囲24ピクセル中、24ピクセルが 1 のもののみ残す
  for( var y = 2; y < results.length - 2; y ++ ){
    for( var x = 2; x < results[y].length - 2; x ++ ){
      var n = 0;
      if( results[y-2][x-2] == 1 ){ n ++; }
      if( results[y-2][x-1] == 1 ){ n ++; }
      if( results[y-2][x] == 1 ){ n ++; }
      if( results[y-2][x+1] == 1 ){ n ++; }
      if( results[y-2][x+2] == 1 ){ n ++; }
      if( results[y-1][x-2] == 1 ){ n ++; }
      if( results[y-1][x-1] == 1 ){ n ++; }
      if( results[y-1][x] == 1 ){ n ++; }
      if( results[y-1][x+1] == 1 ){ n ++; }
      if( results[y-1][x+2] == 1 ){ n ++; }
      if( results[y][x-2] == 1 ){ n ++; }
      if( results[y][x-1] == 1 ){ n ++; }
      if( results[y][x+1] == 1 ){ n ++; }
      if( results[y][x+2] == 1 ){ n ++; }
      if( results[y+1][x-2] == 1 ){ n ++; }
      if( results[y+1][x-1] == 1 ){ n ++; }
      if( results[y+1][x] == 1 ){ n ++; }
      if( results[y+1][x+1] == 1 ){ n ++; }
      if( results[y+1][x+2] == 1 ){ n ++; }
      if( results[y+2][x-2] == 1 ){ n ++; }
      if( results[y+2][x-1] == 1 ){ n ++; }
      if( results[y+2][x] == 1 ){ n ++; }
      if( results[y+2][x+1] == 1 ){ n ++; }
      if( results[y+2][x+2] == 1 ){ n ++; }
      _results[y][x] = ( n > 22 ? 1 : 0 );
    }
  }
  for( var i = 0; i < results.length; i ++ ){
    _results[0][i] = 0;
    _results[1][i] = 0;
    _results[results.length-2][i] = 0;
    _results[results.length-1][i] = 0;
    _results[i][0] = 0;
    _results[i][1] = 0;
    _results[i][results.length-2] = 0;
    _results[i][results.length-1] = 0;
  }

  return JSON.parse( JSON.stringify( _results ) );
}

var appEnv = cfenv.getAppEnv();
var port = appEnv.port || 3000;
app.listen( port );
console.log( "server starting on " + port + " ..." );
