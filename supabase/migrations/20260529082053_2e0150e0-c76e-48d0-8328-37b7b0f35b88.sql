
REVOKE EXECUTE ON FUNCTION public.is_room_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_room(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_room(UUID, UUID) TO authenticated;
