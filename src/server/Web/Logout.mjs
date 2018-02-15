export default async function logout(ctx, next)
{
  ctx.session = null;

  ctx.redirect("/auth");
}
