const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')

const envPath = path.resolve(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue
    const index = line.indexOf('=')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    let value = line.slice(index + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `sns <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: '[sns] 테스트 메일',
      text: '이 메일은 SMTP 설정 점검을 위한 테스트입니다.',
    })
    console.log('메일 전송 성공:', info.messageId)
  } catch (error) {
    console.error('메일 전송 실패:', error)
    process.exit(1)
  }
}

main()
