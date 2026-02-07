import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function fetchLocation(ip?: string) {
  const apiUrl = ip 
    ? `http://ip-api.com/json/${ip}?lang=en&fields=status,city,regionName,country,lat,lon`
    : 'http://ip-api.com/json/?lang=en&fields=status,city,regionName,country,lat,lon';
  
  const response = await fetch(apiUrl);
  if (!response.ok) return null;
  
  const data = await response.json();
  if (data.status !== 'success') return null;
  
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    const trueClientIp = request.headers.get('true-client-ip');
    
    let clientIp = cfConnectingIp || trueClientIp || '';
    
    if (!clientIp && forwardedFor) {
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      clientIp = ips[0] || '';
    }
    
    if (!clientIp) {
      clientIp = realIp || '';
    }
    
    let ipData = null;
    
    const isPrivateIp = clientIp && (
      clientIp.startsWith('127.') || 
      clientIp.startsWith('10.') || 
      clientIp.startsWith('192.168.') ||
      clientIp.startsWith('172.16.') ||
      clientIp.startsWith('172.17.') ||
      clientIp.startsWith('172.18.') ||
      clientIp.startsWith('172.19.') ||
      clientIp.startsWith('172.2') ||
      clientIp.startsWith('172.30.') ||
      clientIp.startsWith('172.31.') ||
      clientIp === '::1'
    );
    
    if (clientIp && !isPrivateIp) {
      ipData = await fetchLocation(clientIp);
    }
    
    if (!ipData) {
      ipData = await fetchLocation();
    }
    
    if (!ipData) {
      return NextResponse.json({ location: 'Hidden location' });
    }

    let locationName = '';
    if (ipData.city && ipData.regionName) {
      locationName = `${ipData.city}, ${ipData.regionName}`;
    } else if (ipData.city) {
      locationName = ipData.city;
    } else if (ipData.country) {
      locationName = ipData.country;
    } else {
      locationName = 'Location detected';
    }

    return NextResponse.json({
      lat: ipData.lat,
      lng: ipData.lon,
      location: locationName,
      city: ipData.city,
      state: ipData.regionName,
      country: ipData.country
    });

  } catch (error) {
    console.error('Geolocation error:', error);
    return NextResponse.json({ location: 'Local oculto' });
  }
}
