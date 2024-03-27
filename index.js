const functions = require("@google-cloud/functions-framework");
var pg = require("pg");

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent("triggerUserVerificationEmail", (cloudEvent) => {
  const protocol = process.env.PROTOCOL;
  const domain = process.env.DOMAIN;
  const port = process.env.API_PORT;
  const version = process.env.VERSION;
  const verifyEndPoint = process.env.VERIFY_END_POINT;
  // const setValidityEndPoint = process.env.SET_VALIDITY_END_POINT;
  const validityMinutes = parseInt(process.env.VALIDITY_MINUTES);
  const mailChimpAPIKey = process.env.MAILCHIMP_API_KEY;

  // Postgres connection details
  // password@ip:port/nameOfDatabase
  const dbUserName = process.env.DATABASE_USER;
  const dbPassword = process.env.DATABASE_PASSWORD;
  const dbIP = process.env.DATABASE_IP;
  const dbPORT = process.env.DB_PORT;
  const dbName = process.env.DB_NAME;

  // The Pub/Sub message is passed as the CloudEvent's data payload.
  const base64Data = cloudEvent.data.message.data;

  const { username } = JSON.parse(
    Buffer.from(base64Data, "base64").toString("utf-8")
  );

  const mailchimpClient = require("@mailchimp/mailchimp_transactional")(
    mailChimpAPIKey
  );

  const base = `${protocol}://${domain}:${port}/${version}`;
  const url = `${base}/${verifyEndPoint}?username=${username}`;

  const html = `<div>
      Click or copy/paste following link in a new browser window to confirm your email <a href=\"${url}\">Link</a> ${url}
    </div>`;

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
      },
    ],
  };

  console.log(messageConfiguration);

  const run = async () => {
    const response = await mailchimpClient.messages.send({
      message: messageConfiguration,
    });

    console.log(response);

    if (response[0].status == "sent") {
      const validUpto = new Date();
      validUpto.setMinutes(validUpto.getMinutes() + validityMinutes);

      await setValidity(username, validUpto);
    }
  };

  const setValidity = async (username, validity) => {
    // use pg client to update the db entry
    const connectionString = `postgres://${dbUserName}:${dbPassword}@${dbIP}:${dbPORT}/${dbName}`;
    var pgClient = new pg.Client(connectionString);
    await pgClient.connect();

    console.log(`UPDATE "user" SET "validity" = ${validity} where "username" = '${username}'`);


    // var queryResult = await pgClient.query(
    //   `UPDATE "user" SET "validity" = ${validity} where "username" = '${username}'`
    // );

    console.log(queryResult)
  };

  run();
});
