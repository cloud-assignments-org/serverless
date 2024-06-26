const functions = require("@google-cloud/functions-framework");
const pg = require("pg");
const randomUUID = require("crypto").randomUUID;

const formData = require("form-data");
const Mailgun = require("mailgun.js");
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent("triggerUserVerificationEmail", async (cloudEvent) => {
  console.log(cloudEvent);

  const protocol = process.env.PROTOCOL;
  const domain = process.env.DOMAIN;
  const port = process.env.API_PORT;
  const version = process.env.VERSION;
  const verifyEndPoint = process.env.VERIFY_END_POINT;
  const validityMinutes = parseInt(process.env.VALIDITY_MINUTES);

  const senderFullName = process.env.SENDER_FULL_NAME;
  const senderEmail = process.env.SENDER_EMAIL;
  const emailSubject = process.env.EMAIL_SUBJECT;

  // Postgres connection details
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

  console.log("username ", username);

  // const mailchimpClient = require("@mailchimp/mailchimp_transactional")(
  //   mailChimpAPIKey
  // );

  const validityToken = randomUUID();

  const base = `${protocol}://${domain}:${port}/${version}`;
  const url = `${base}/${verifyEndPoint}?username=${username}&validityToken=${validityToken}`;

  const html = `<div>
      Click or copy/paste following link in a new browser window to confirm your email <a href=\"${url}\">Link</a> ${url}
    </div>`;

  // console.log(html);

  const validUpto = new Date();
  validUpto.setMinutes(validUpto.getMinutes() + validityMinutes);

  mg.messages
    .create(domain, {
      from: `${senderFullName} <${senderEmail}>`,
      to: [username],
      subject: emailSubject,
      html,
    })
    .then(async (msg) => {
      console.log(msg);
      // use pg client to update the db entry
      const connectionString = `postgres://${dbUserName}:${dbPassword}@${dbIP}:${dbPORT}/${dbName}`;

      console.log("connnection string ", connectionString);

      var pgClient = new pg.Client(connectionString);
      await pgClient.connect();

      function convertDateFormat(date) {
        // Format the date and time components
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");
        const milliseconds = date.getMilliseconds().toString().padStart(3, "0");

        // Construct the formatted date string
        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;

        return formattedDate;
      }

      const query = `UPDATE "user" SET "validity" = '${convertDateFormat(
        validUpto
      )}', "validityToken" ='${validityToken}' where "username" = '${username}'`;

      console.log(query);

      var queryResult = await pgClient.query(query);

      console.log(queryResult);

      await pgClient
        .end()
        .then(() => {
          console.log("Connection to PostgreSQL closed");
        })
        .catch((err) => {
          console.error("Error closing connection", err);
        });
    }) // logs response data
    .catch((err) => console.log(err)); // logs any error
});
