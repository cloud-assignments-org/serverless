const functions = require('@google-cloud/functions-framework');

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent('triggerUserVerificationEmail', cloudEvent => {

  const protocol = process.env.PROTOCOL
  const domain = process.env.DOMAIN;
  const port = process.env.API_PORT;
  const version = process.env.VERSION;
  const verifyEndPoint = process.env.VERIFY_END_POINT;
  const setValidityEndPoint = process.env.SET_VALIDITY_END_POINT;
  const validityMinutes = parseInt(process.env.VALIDITY_MINUTES);
  const mailChimpAPIKey = process.env.MAILCHIMP_API_KEY;

  // The Pub/Sub message is passed as the CloudEvent's data payload.
  const base64Data = cloudEvent.data.message.data;

  const {username} = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf-8'));

  const mailchimpClient = require("@mailchimp/mailchimp_transactional")(
    mailChimpAPIKey
  );
  
  const base = `${protocol}://${domain}:${port}/${version}`;
  const url = `${base}/${verifyEndPoint}?username=${username}`;

  const html = `<div>
      Click or copy/paste following link in a new browser window to confirm your email <a href=\"${url}\">Link</a> ${url}
    </div>`

  console.log(html);

  const validUpto = new Date();
  validUpto.setMinutes(validUpto.getMinutes() + validityMinutes);

  const messageConfiguration = {
    html,
    subject: "User email verification",
    from_email: "dhruv@parthadhruv.com",
    to: [
      {
        email: `${username}`,
      }
    ]  
  }

  console.log(messageConfiguration);

  const run = async () => {

    const response = await mailchimpClient.messages.send({ message: messageConfiguration });

    console.log(response);

    if(response[0].status == "sent"){

      const validUpto = new Date();
      validUpto.setMinutes(validUpto.getMinutes() + validityMinutes);

      // trigger the api call to set the validity date for the user email verification
      const url = `${base}/${setValidityEndPoint}`;
      const options = {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            validUpto,
            username
          },
        };

      console.log(options.body);

      const response = await fetch(url, options);
      console.log("Set email validity ", response);
    }
  };

  run();

  // const test = async () => {
  //   const url2 = `${base}/${setValidityEndPoint}?userName=${username}`;
  //   console.log(url2);
  //   const response = await fetch(url2).catch((err) => console.log(err));
  //   console.log("Sent validate link to user ", response); 
  // }

  // test();

 
});
