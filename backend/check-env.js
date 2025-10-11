// Quick environment check script
console.log('🔍 Environment Variables Check:');
console.log('================================');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`CORS_ORIGIN: ${process.env.CORS_ORIGIN}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set ✅' : 'Missing ❌'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'Set ✅' : 'Missing ❌'}`);
console.log(`IONOS_SFTP_HOST: ${process.env.IONOS_SFTP_HOST ? 'Set ✅' : 'Missing ❌'}`);
console.log(`IONOS_SFTP_USERNAME: ${process.env.IONOS_SFTP_USERNAME ? 'Set ✅' : 'Missing ❌'}`);
console.log(`IONOS_SFTP_PASSWORD: ${process.env.IONOS_SFTP_PASSWORD ? 'Set ✅' : 'Missing ❌'}`);
console.log(`IONOS_SFTP_BASE_PATH: ${process.env.IONOS_SFTP_BASE_PATH}`);

if (process.env.CORS_ORIGIN) {
  const origins = process.env.CORS_ORIGIN.split(',');
  console.log('\n🌐 Allowed CORS Origins:');
  origins.forEach(origin => console.log(`  - ${origin.trim()}`));
}