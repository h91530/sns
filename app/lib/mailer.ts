'use server'

import nodemailer from 'nodemailer'

type MailOptions = {
  to: string
  subject: string
  html: string
}

let transporter: nodemailer.Transporter | null = null

const getTransporter = () => {
  if (transporter) {
    return transporter
  }

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    return null
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : true,
    auth: {
      user,
      pass,
    },
  })

  return transporter
}

export async function sendMail({ to, subject, html }: MailOptions) {
  const mailer = getTransporter()

  if (!mailer) {
    console.warn('SMTP credentials are not configured; skipping email send.')
    return false
  }

  const from =
    process.env.EMAIL_FROM ||
    `sns <${process.env.SMTP_USER}>`

  try {
    await mailer.sendMail({
      from,
      to,
      subject,
      html,
    })

    return true
  } catch (error) {
    console.error('Mail send error:', error)
    return false
  }
}
