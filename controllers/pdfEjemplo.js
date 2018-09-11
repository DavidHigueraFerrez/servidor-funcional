
let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
let estados = require('../estados');
let pdf = require('html-pdf');
let fs = require('fs');
let ejs = require('ejs')
let options = {
    'text': 'draft',
    'dstPath': './public/pdfs/salida.pdf'
}
let html =  `
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.2/css/bootstrap-select.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.2/js/bootstrap-select.min.js"></script>

<div id="pageHeader-first">Header on first page</div>
<h1>Hola</h1>
<table class="table" style="width:100%">
  <thead>
    <tr>
      <th scope="col">#</th>
      <th scope="col">First</th>
      <th scope="col">Last</th>
      <th scope="col">Handle</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">1</th>
      <td>Mark</td>
      <td>Otto</td>
      <td>@mdo</td>
    </tr>
    <tr>
      <th scope="row">2</th>
      <td>Jacob</td>
      <td>Thornton</td>
      <td>@fat</td>
    </tr>
    <tr>
      <th scope="row">3</th>
      <td>Larry</td>
      <td>the Bird</td>
      <td>@twitter</td>
    </tr>
  </tbody>
</table>
<h1>Hola</h1>
<div id="pageFooter-first">Footer on first page</div>
<div style="page-break-after:always;"></div>
<div id="pageHeader-2">Header on second page</div>
<h1>Hola que tal estas esto es un ejemplo de texto que voy a utilizar para cambiar de página</h1>
<h1>Hola que tal estas esto es un ejemplo de texto que voy a utilizar para cambiar de página</h1>
<h1>Hola que tal estas esto es un ejemplo de texto que voy a utilizar para cambiar de página</h1>
<h1>Hola que tal estas esto es un ejemplo de texto que voy a utilizar para cambiar de página</h1>
<div id="pageFooter-2">Footer on second page</div>
`;



exports.generarPDF = function (req,res,next){

    pdf.create(html).toFile('./public/pdfs/salida.pdf', function (err, resp) {
        if (err) return console.log(err);
        watermark.embedWatermarkWithCb('./public/pdfs/salida.pdf', options, function (err,resp2){
          if (err) return console.log(err);
             
       });     
    });

}
