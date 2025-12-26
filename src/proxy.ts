import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

export const config = {
  matcher: [
    "/settings/:path*",
    "/dashboard/:path*",
    "/api/user/:path*"
  ]
}
