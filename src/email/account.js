const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendWelcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'ajayyadav4258@gmail',
        subject: 'Thanks For Joining In',
        text: `Welcome to the Task-App ${name}` 
    })
}

const sendCancelEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'ajayyadav4258@gmail',
        subject: 'Task-App account deleted',
        text: `${name} please let us know why you canceled account.` 
    })
}

module.exports = {
    sendWelcomeEmail,
    sendCancelEmail
}