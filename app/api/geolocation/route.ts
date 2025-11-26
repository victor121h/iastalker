import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function fetchLocation(ip?: string) {
  const apiUrl = ip 
    ? `http://ip-api.com/json/${ip}?lang=pt-BR&fields=status,city,regionName,country,lat,lon`
    : 'http://ip-api.com/json/?lang=pt-BR&fields=status,city,regionName,country,lat,lon';
  
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
    const clientIp = forwardedFor?.split(',')[0].trim() || realIp || '';
    
    let ipData = null;
    
    if (clientIp && !clientIp.startsWith('127.') && !clientIp.startsWith('10.') && !clientIp.startsWith('192.168.')) {
      ipData = await fetchLocation(clientIp);
    }
    
    if (!ipData) {
      ipData = await fetchLocation();
    }
    
    if (!ipData) {
      return NextResponse.json({ location: 'Local oculto' });
    }

    let locationName = '';
    if (ipData.city && ipData.regionName) {
      locationName = `${ipData.city}, ${ipData.regionName}`;
    } else if (ipData.city) {
      locationName = ipData.city;
    } else if (ipData.country) {
      locationName = ipData.country;
    } else {
      locationName = 'Localização detectada';
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
