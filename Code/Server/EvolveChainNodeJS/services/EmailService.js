const config = require('config');
const nodemailer = require('nodemailer');

class EmailService{	

	// constructor(req, res, db){
	// 	this.req = req
    //     this.res = res
    //     this.db = db
	// }  

    SendEmail(toEmailIds, subject, htmlEmailBody) {

        var mailOption = {
            from: config.get('FROM_EMAIL'),
            to: toEmailIds, // list of receivers
            subject: subject, // Subject line
            html: htmlEmailBody
        }
    
    var transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 465,
            auth: {
                user: process.env.SMTP_USERNAME || 'gordhan@yudiz.com', // SMTP email
                pass: process.env.SMTP_PASSWORD || 'Gordhan_9033' // Your password
            },
            secure: true
        });
    
    return transporter.sendMail(mailOption).then(function(success) {
       // return success.messageId;
       transporter.close();
    }).catch(function(err) {
        //return err;
        console.log(err);
    });
};
	
}

module.exports = new EmailService();