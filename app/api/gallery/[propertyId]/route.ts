import { NextResponse } from "next/server";
import { getGallery } from "@/lib/gallery/galleryService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

export const revalidate = 3600;

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      propertyId: string;
    }>;
  },
) {
  try {
    const limited = rateLimit({
      key: `gallery:${clientIp(request)}`,
      limit: 120,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const { propertyId } = await params;

    if (!propertyId?.trim()) {
      return NextResponse.json(
        { error: "Missing propertyId" },
        { status: 400 },
      );
    }

    const gallery = await getGallery(propertyId);

    return jsonOk(gallery);
  } catch (error) {
    return jsonError(error, "Gallery not found");
  }
}
