import * as dns from 'dns';
import { promises as dnsPromises } from 'dns';

async function testDNS() {
  console.log('🔍 DNS & Network Diagnostic Test\n');

  // Test 1: Basic DNS resolution
  console.log('📡 Test 1: DNS Resolution');
  console.log('   Hostname: alerted.rkoxola.mongodb.net');
  
  try {
    const resolve4 = await dnsPromises.resolve4('alerted.rkoxola.mongodb.net');
    console.log('   ✅ DNS A-record resolved:', resolve4[0]);
  } catch (error: any) {
    console.log('   ❌ DNS resolution failed:', error.message);
  }

  // Test 2: SRV record lookup (what MongoDB uses)
  console.log('\n📡 Test 2: SRV Record Lookup (MongoDB)');
  console.log('   Looking for: _mongodb._tcp.alerted.rkoxola.mongodb.net');
  
  try {
    const srvRecords = await dnsPromises.resolveSrv('_mongodb._tcp.alerted.rkoxola.mongodb.net');
    console.log('   ✅ SRV records found:', srvRecords.length);
    srvRecords.forEach((srv, i) => {
      console.log(`      ${i+1}. ${srv.name}:${srv.port}`);
    });
  } catch (error: any) {
    console.log('   ❌ SRV lookup failed:', error.message);
    console.log('   💡 This is likely your issue!');
  }

  // Test 3: Check DNS server
  console.log('\n📡 Test 3: Current DNS Server');
  const dnsServers = dns.getServers();
  console.log('   Using DNS servers:', dnsServers);

  // Test 4: Try alternate DNS
  console.log('\n📡 Test 4: Testing with Google DNS (8.8.8.8)');
  const resolver = new dnsPromises.Resolver();
  resolver.setServers(['8.8.8.8', '8.8.4.4']);
  
  try {
    const srvRecords = await resolver.resolveSrv('_mongodb._tcp.alerted.rkoxola.mongodb.net');
    console.log('   ✅ SRV records with Google DNS:', srvRecords.length);
    srvRecords.forEach((srv, i) => {
      console.log(`      ${i+1}. ${srv.name}:${srv.port}`);
    });
  } catch (error: any) {
    console.log('   ❌ Also failed with Google DNS:', error.message);
  }

  console.log('\n💡 Recommendations:');
  console.log('   If SRV lookup fails:');
  console.log('   1. Check your ISP/corporate firewall');
  console.log('   2. Try using VPN');
  console.log('   3. Try different DNS servers');
  console.log('   4. Restart your internet connection');
  console.log('   5. Use direct connection string without SRV');
}

testDNS().catch(console.error);
