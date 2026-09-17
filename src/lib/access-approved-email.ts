import { escapeHtml, getAppUrl, sendEmail } from "@/lib/email";

type ApprovedAccessEmail = {
  email: string;
  fullName: string;
  planName: string;
  bacTypeName: string;
  startedAt: Date;
  expiresAt: Date;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

export async function sendAccessApprovedEmail(input: ApprovedAccessEmail) {
  const appUrl = getAppUrl();
  const name = escapeHtml(input.fullName);
  const planName = escapeHtml(input.planName);
  const bacTypeName = escapeHtml(input.bacTypeName);
  const startedAt = formatDate(input.startedAt);
  const expiresAt = formatDate(input.expiresAt);

  await sendEmail({
    to: input.email,
    subject: `Your ${input.bacTypeName} access is approved | Curio`,
    html: `
      <div style="margin:0;background:#f4f6f8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827">
        <div style="margin:0 auto;max-width:620px;overflow:hidden;border:1px solid #dfe4ea;background:#ffffff">
          <div style="background:#111827;padding:30px 32px;color:#ffffff">
            <div style="font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#93c5fd">Curio</div>
            <h1 style="margin:18px 0 0;font-size:28px;line-height:1.2">Your access is approved</h1>
            <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#d1d9e6">Your learning space is ready.</p>
          </div>
          <div style="padding:32px">
            <p style="margin:0;font-size:16px;line-height:1.6">Hello ${name},</p>
            <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#526079">Your access request has been reviewed and approved. Here are the details you need:</p>
            <div style="margin:24px 0;border:1px solid #e6eaf0;border-radius:12px;background:#f8fafc;padding:20px">
              <div style="margin-bottom:14px;font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#74819a">Access details</div>
              <p style="margin:8px 0;font-size:15px"><strong>Bac type:</strong> ${bacTypeName}</p>
              <p style="margin:8px 0;font-size:15px"><strong>Plan:</strong> ${planName}</p>
              <p style="margin:8px 0;font-size:15px"><strong>Active from:</strong> ${startedAt}</p>
              <p style="margin:8px 0;font-size:15px"><strong>Access ends:</strong> ${expiresAt}</p>
            </div>
            <div style="margin:24px 0">
              <div style="font-size:15px;font-weight:700">What to do next</div>
              <ol style="margin:12px 0 0;padding-left:22px;color:#526079;font-size:15px;line-height:1.8">
                <li>Open your learning desk.</li>
                <li>Select the subjects you want to study if prompted.</li>
                <li>Choose a course and continue chapter by chapter.</li>
              </ol>
            </div>
            <a href="${appUrl}/learn" style="display:inline-block;background:#2563eb;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Open my learning desk</a>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#74819a">You can manage your access and account from your dashboard. If you did not request this access, please contact the Curio team.</p>
          </div>
          <div style="border-top:1px solid #e8ecf0;padding:20px 32px;color:#8a96a9;font-size:12px;line-height:1.6">Curio · Learn with a clear plan.</div>
        </div>
      </div>
    `,
  });
}