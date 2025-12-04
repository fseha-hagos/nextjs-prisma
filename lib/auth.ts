import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import prisma from "./db";

export const auth = betterAuth({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: { 
        enabled: true,
        requireEmailVerification: true,
        sendVerificationEmail: async ({ user, url }: { user: { email: string, name?: string }, url: string }) => {
            const { sendVerificationEmail } = await import("./email");
            // Better-auth provides the full verification URL
            // Extract token from URL to create a callback to our verification page
            try {
                const urlObj = new URL(url);
                const token = urlObj.searchParams.get('token');
                // Create a callback URL that points to our verification page
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || urlObj.origin;
                const callbackUrl = token 
                    ? `${baseUrl}/verify-email?token=${token}`
                    : url;
                await sendVerificationEmail(user.email, callbackUrl, user.name);
            } catch (error) {
                // If URL parsing fails, use the original URL
                await sendVerificationEmail(user.email, url, user.name);
            }
        },
    },
    
    plugins: [
        organization({
            teams: {
                enabled: true,
            },
        }),
    ],
});