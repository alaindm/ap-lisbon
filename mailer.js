var nodemailer = require('nodemailer');
var hbs = require('nodemailer-express-handlebars');
var options = {
    viewEngine: {
        extname: '.hbs',
        layoutsDir: 'views/email/',
        defaultLayout : 'template',
        partialsDir : 'views/partials/'
    },
    viewPath: 'views/email/',
    extName: '.hbs'
};
var sgTransport = require('nodemailer-sendgrid-transport');

var send_grid = {
    auth: {         
     api_key: process.env.SENDGRID_API_KEY
    // api_key: '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'
    }
}

var emailSend = function(to, subject, template, variables){
    var mailer = nodemailer.createTransport(sgTransport(send_grid));
    mailer.use('compile', hbs(options));
    mailer.sendMail({
        from: 'goldenvisa@example.com',
        to: to,
        subject: subject,
        template: template,
        context: variables
    }, function (error, response) {
        console.log('mail sent');
        console.log(response)
        console.log(error)
        mailer.close();
    });
}

module.exports = emailSend



// var mailer = nodemailer.createTransport(sgTransport(send_grid));
// mailer.use('compile', hbs(options));
// mailer.sendMail({
//     from: 'goldenvisa@example.com',
//     to: 'alaindemarchi@gmail.com',
//     subject: 'Teste Subject',
//     template: 'accountActivation',
//     context: {
//         token : 'value1',
//         firstName : 'value2'
//     }
// }, function (error, response) {
//     console.log('mail sent');
//     console.log(response)
//     console.log(error)
//     mailer.close();
// });