import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { isRead?: boolean; isStarred?: boolean };
    const data: { isRead?: boolean; isStarred?: boolean } = {};

    if (typeof body.isRead === "boolean") {
      data.isRead = body.isRead;
    }

    if (typeof body.isStarred === "boolean") {
      data.isStarred = body.isStarred;
    }

    const entry = await prisma.entry.update({
      where: { id },
      data,
      include: {
        feed: {
          select: {
            id: true,
            title: true,
            siteUrl: true
          }
        }
      }
    });

    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
