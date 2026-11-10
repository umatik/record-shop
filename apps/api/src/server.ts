import app from "@/app.js";

import { EmailService } from "@/services/email.service.js";
import { deliverCustomerMail } from "@/services/customer-mail.js";

const mailer = new EmailService();
async function drainMail() {
  try { while (await deliverCustomerMail(mailer)) { /* Drain the pending batch. */ } }
  catch { console.error("Could not process customer mail queue"); }
  finally { setTimeout(drainMail, 3000).unref(); }
}
void drainMail();
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
