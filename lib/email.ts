export async function sendPlaylistEmail(email: string, playlistLink: string) {
  try {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, playlistLink }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Email API error:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid email credentials. Please check your email configuration.');
      }
      if (response.status === 503) {
        throw new Error('Unable to connect to email server. Please try again later.');
      }
      
      throw new Error(data.error || data.details || 'Failed to send email');
    }

    if (!data.success) {
      throw new Error('Email sending failed without specific error');
    }

    return data;
  } catch (error) {
    console.error('Email sending error:', error);
    // Don't throw the error, just return null to handle it gracefully
    return null;
  }
}