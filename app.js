//.  app.js
var express = require( 'express' ),
    Canvas = require( 'canvas' ),
    cfenv = require( 'cfenv' ),
    multer = require( 'multer' ),
    bodyParser = require( 'body-parser' ),
    easyimg = require( 'easyimage' ),
    fs = require( 'fs' ),
    app = express(),
    Image = Canvas.Image,
    upload = multer({ dest: './tmp/' } );

app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.Router() );
app.use( express.static( __dirname + '/public' ) );

var image_size = 200;
var threshhold = 10;

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
    var option1 = { src: path1, dst: path01, width: image_size, height: image_size };
    easyimg.resize( option1 ).then(
      function( file1 ){
        var width1 = file1.width;
        var height1 = file1.height;
        //var img_content1 = fs.readFileSync( path01 );

        var img1 = new Image;
        img1.src = path01;
        var canvas1 = new Canvas.createCanvas( img1.width, img1.height );
        var ctx1 = canvas1.getContext( '2d' );
        ctx1.drawImage( img1, 0, 0, img1.width, img1.height );
        var imagedata1 = ctx1.getImageData( 0, 0, img1.width, img1.height );

        var path02 = path2 + '_0';
        var option2 = { src: path2, dst: path02, width: image_size, height: image_size };
        easyimg.resize( option2 ).then(
          function( file2 ){
            var width2 = file2.width;
            var height2 = file2.height;
            //var img_content2 = fs.readFileSync( path02 );

            var img2 = new Image;
            img2.src = path02;
            var canvas2 = new Canvas.createCanvas( img2.width, img2.height );
            var ctx2 = canvas2.getContext( '2d' );
            ctx2.drawImage( img2, 0, 0, img2.width, img2.height );
            var imagedata2 = ctx2.getImageData( 0, 0, img2.width, img2.height );

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

var appEnv = cfenv.getAppEnv();
var port = appEnv.port || 3000;
app.listen( port );
console.log( "server starting on " + port + " ..." );
