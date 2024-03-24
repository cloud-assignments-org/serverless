const functions = require('@google-cloud/functions-framework');

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent('triggerUserVerificationEmail', cloudEvent => {
  // The Pub/Sub message is passed as the CloudEvent's data payload.
  // const base64Data = cloudEvent.data.message.data;
  // const {username} = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf-8'));

  const username = cloudEvent.data.message.data.username;
  // console.log(`Hello, ${username}!`);

  // console.log("Mailchimp api key ", process.env.MAILCHIMP_API_KEY);
  process.env.MAILCHIMP_API_KEY = "md-yz6F3wdSdOFqPdtTPVQFLQ";

  const mailchimpClient = require("@mailchimp/mailchimp_transactional")(
    process.env.MAILCHIMP_API_KEY
  );

  const protocol = "https"
  const domain = "parthadhruv.com";
  const port = 3000;
  const verifyEndPoint = "user/verifyEmail";
  const base = `${protocol}://${domain}:${port}`;
  const setValidityEndPoint = "user/setValidity";
  const validityMinutes = 2;
  
  const url = `${base}/${verifyEndPoint}?username=${username}`;

  const html = `<div>
      Click or copy/paste following link in a new browser window to confirm your email <a href=\"${url}\">Link</a> ${url}
    </div>`

  console.log(html);

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

  // console.log(messageConfiguration);

  const run = async () => {
    const response = await mailchimpClient.messages.send({ message: messageConfiguration });
    console.log(response);

    if(response[0].status == "sent"){

      const validUpto = new Date();
      validUpto.setMinutes(validUpto.getMinutes() + validityMinutes);

      // trigger the api call to set the validity date for the user email verification
      const url = `${base}/${setValidityEndPoint}`;
      const options = {
          method: "PUT", // *GET, POST, PUT, DELETE, etc.
          headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: JSON.stringify({
            validUpto,
            username
          }), // body data type must match "Content-Type" header
        };
      const response = await fetch(url, options);
      console.log("Sent validate link to user ", response);
    }
  };

  // run();

  const test = async () => {
    const url2 = `${base}/${setValidityEndPoint}?userName=${username}`;
    console.log(url2);
    const response = await fetch(url2).catch((err) => console.log(err));
    console.log("Sent validate link to user ", response); 
  }

  // test();

 
});
