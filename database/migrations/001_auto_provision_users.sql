-- Auto-provision a tenant + user profile when a new auth.users row is created.
-- Covers every auth method (email sign-up, OAuth, magic link) without app-layer code.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id uuid;
  v_display_name text;
  v_slug text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_display_name := COALESCE(NULLIF(NEW.profile->>'name', ''), split_part(NEW.email, '@', 1), NEW.email);
  v_slug := lower(regexp_replace(NEW.id::text, '[^a-z0-9]+', '-', 'g'));

  INSERT INTO public.tenants (name, slug)
  VALUES (v_display_name || '''s workspace', v_slug)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.users (id, tenant_id, name, avatar_url, role)
  VALUES (
    NEW.id,
    v_tenant_id,
    v_display_name,
    NEW.profile->>'avatar_url',
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
