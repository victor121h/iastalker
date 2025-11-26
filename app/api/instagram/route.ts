import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 }
    );
  }

  const accessKey = process.env.HIKERAPI_ACCESS_KEY;

  if (!accessKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.hikerapi.com/v1/user/by/username?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'accept': 'application/json',
          'x-access-key': accessKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HikerAPI error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch Instagram profile', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const profileData = {
      username: data.username || username,
      name: data.full_name || data.username || username,
      avatar: data.profile_pic_url || data.profile_pic_url_hd || '',
      bio: data.biography || '',
      posts: data.media_count || 0,
      followers: data.follower_count || 0,
      following: data.following_count || 0,
      isPrivate: data.is_private || false,
      isVerified: data.is_verified || false,
      externalUrl: data.external_url || '',
      pk: data.pk || data.id || '',
    };

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error fetching Instagram profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Instagram profile' },
      { status: 500 }
    );
  }
}
