import { NextResponse } from 'next/server';

const HEALTH_ENDPOINT = process.env.BACKEND_HEALTH_URL || 'https://suitable-phoenix-suitable.ngrok-free.app/health';
const ALERT_EMAIL = process.env.ALERT_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Track if this is the first check (startup)
let isFirstCheck = true;

export async function GET() {
  const timestamp = new Date().toISOString();
  
  try {
    // Make health check request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(HEALTH_ENDPOINT, {
      headers: {
        'User-Agent': 'Vercel-HealthCheck',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is healthy:', data);
      
      // Send startup email on first successful check
      if (isFirstCheck && ALERT_EMAIL && RESEND_API_KEY) {
        try {
          await sendStartupEmail(data);
          console.log('✅ Startup email sent');
        } catch (emailError) {
          console.error('Failed to send startup email:', emailError);
        }
        isFirstCheck = false; // Mark that startup email has been sent
      }
      
      return NextResponse.json({ 
        status: 'healthy', 
        message: 'Backend is up and running',
        data,
        timestamp,
      });
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error: any) {
    // Backend is down - send email
    const errorMessage = error.message || 'Unknown error';
    console.error('❌ Health check failed:', errorMessage);
    
    if (ALERT_EMAIL && RESEND_API_KEY) {
      try {
        await sendAlertEmail(errorMessage);
        console.log('✅ Alert email sent');
      } catch (emailError) {
        console.error('Failed to send alert email:', emailError);
      }
    } else {
      console.warn('Email alerts not configured. Set ALERT_EMAIL and RESEND_API_KEY to enable email notifications.');
    }
    
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: errorMessage,
        timestamp,
      },
      { status: 500 }
    );
  }
}

async function sendStartupEmail(healthData: any) {
  if (!RESEND_API_KEY || !ALERT_EMAIL) {
    return;
  }

  const emailBody = `
✅ Crypto Warrior Backend is Online

The backend health check has passed successfully. The service is up and running.

Status: Healthy
Network: ${healthData.network || 'N/A'}
Package ID: ${healthData.package_id || 'N/A'}
Timestamp: ${new Date().toISOString()}

This is an automated notification from the Vercel health check cron job.
  `.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Crypto Warrior Alerts <onboarding@resend.dev>',
        to: ALERT_EMAIL,
        subject: '✅ Crypto Warrior Backend is Online',
        text: emailBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ Startup email sent successfully:', data.id);
  } catch (emailError: any) {
    console.error('❌ Failed to send startup email:', emailError);
    throw emailError;
  }
}

async function sendAlertEmail(error: string) {
  if (!RESEND_API_KEY || !ALERT_EMAIL) {
    return;
  }

  const emailBody = `
🚨 Crypto Warrior Backend Health Check Failed

The backend health check has failed. Please check the service immediately.

Error: ${error}
Endpoint: ${HEALTH_ENDPOINT}
Timestamp: ${new Date().toISOString()}

This is an automated alert from the Vercel health check cron job.
  `.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Crypto Warrior Alerts <onboarding@resend.dev>',
        to: ALERT_EMAIL,
        subject: '🚨 Crypto Warrior Backend is DOWN',
        text: emailBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ Alert email sent successfully:', data.id);
  } catch (emailError: any) {
    console.error('❌ Failed to send alert email:', emailError);
    throw emailError;
  }
}

