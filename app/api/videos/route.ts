import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  try {
    const result = await cloudinary.search
      .expression('folder:videos/*')
      .with_field('context')
      .with_field('tags')
      .max_results(100)
      .execute();

    const videos = result.resources.map((resource: any) => ({
      id: resource.public_id,
      title: resource.context?.title || resource.public_id.split('/').pop(),
      duration: resource.context?.duration,
      thumbnailUrl: resource.secure_url,
      videoUrl: resource.secure_url.replace('/upload/', '/upload/q_auto,f_auto/'),
      description: resource.context?.description,
      publicId: resource.public_id,
      tags: resource.tags || [],
      category: resource.context?.category || 'Uncategorized',
    }));

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
} 