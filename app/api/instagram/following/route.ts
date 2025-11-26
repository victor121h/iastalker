import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
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
      `https://api.hikerapi.com/v1/user/following/chunk?user_id=${encodeURIComponent(userId)}`,
      {
        headers: {
          'accept': 'application/json',
          'x-access-key': accessKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HikerAPI following error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch following list', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('HikerAPI following raw response type:', typeof data, Array.isArray(data));
    
    const followingList: any[] = [];
    
    let users: any[] = [];
    
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      users = data[0];
    } else if (Array.isArray(data)) {
      users = data;
    } else if (data && data.users && Array.isArray(data.users)) {
      users = data.users;
    } else if (data && typeof data === 'object') {
      users = Object.values(data).filter(item => item && typeof item === 'object' && 'username' in (item as any));
    }

    for (const user of users.slice(0, 15)) {
      if (user && user.username) {
        followingList.push({
          pk: user.pk || user.id,
          username: user.username,
          fullName: user.full_name,
          avatar: user.profile_pic_url,
          isPrivate: user.is_private || false,
          isVerified: user.is_verified || false,
        });
      }
    }

    console.log('Parsed following list count:', followingList.length);
    return NextResponse.json({ following: followingList });
  } catch (error) {
    console.error('Error fetching following list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch following list' },
      { status: 500 }
    );
  }
}
