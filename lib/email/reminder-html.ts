interface ReminderEmailParams {
  displayName: string
  missingSections: string[]
  deadlineLocal: string
  siteUrl: string
}

const SECTION_CONFIG: Record<string, { label: string; path: string }> = {
  group:    { label: 'Group Stage Predictions',  path: '/predictions' },
  knockout: { label: 'Knockout Bracket',         path: '/predictions/knockout' },
  awards:   { label: 'Awards Predictions',       path: '/predictions/awards' },
}

export function buildReminderEmail(params: ReminderEmailParams): { subject: string; html: string } {
  const { displayName, missingSections, deadlineLocal, siteUrl } = params
  const count = missingSections.length

  const subject = '⏰ Your World Cup 2026 predictions — 36 hours left'

  const sectionsHtml = missingSections.map(section => {
    const cfg = SECTION_CONFIG[section] ?? { label: section, path: '/predictions' }
    const url = `${siteUrl}${cfg.path}`
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="color:#111827;font-size:15px;font-weight:600;">${cfg.label}</td>
              <td align="right">
                <a href="${url}"
                   style="display:inline-block;background:#0057A8;color:#ffffff;text-decoration:none;
                          border-radius:6px;padding:10px 20px;font-size:14px;font-weight:600;">
                  Complete now →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0a0f1e;border-radius:8px 8px 0 0;padding:28px 24px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">
                WC 2026 Predictions
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px 28px;border-radius:0 0 8px 8px;">

              <p style="margin:0 0 20px;font-size:16px;color:#111827;">Hi ${displayName},</p>

              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                The prediction deadline closes on
                <strong>${deadlineLocal}</strong>.
                You have <strong>${count} section${count !== 1 ? 's' : ''}</strong> still to complete:
              </p>

              <!-- Missing sections -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                ${sectionsHtml}
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

              <p style="margin:0 0 12px;font-size:14px;color:#6b7280;line-height:1.6;">
                Once the deadline passes, predictions are locked and cannot be changed.
              </p>
              <p style="margin:0;font-size:14px;color:#374151;">
                — The WC 2026 Predictions app
              </p>

            </td>
          </tr>

          <!-- Footer note -->
          <tr>
            <td style="padding:20px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you have an account at
                <a href="${siteUrl}" style="color:#9ca3af;text-decoration:underline;">${siteUrl.replace('https://', '')}</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}
