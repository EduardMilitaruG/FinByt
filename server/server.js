import dotenv from 'dotenv';

// Load environment variables before anything reads them
dotenv.config();

const { getJwtSecret } = await import('./config.js');
const { default: app } = await import('./app.js');

// Fail at startup rather than sign tokens with a guessable secret
getJwtSecret();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});
