# core/urls.py

from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from django.urls import path, include
from .views import UserViewSet, PostViewSet, CommentViewSet, RegisterView

# 1. Main Router for top-level resources
router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('posts', PostViewSet, basename='post')

# 2. Nested Router for Comments (nested under Posts)
# This creates a URL like /posts/{post_pk}/comments/
posts_router = routers.NestedSimpleRouter(router, r'posts', lookup='post')
posts_router.register(r'comments', CommentViewSet, basename='post-comments')

# 3. Nested Router for User's Posts (nested under Users)
# This creates a URL like /users/{user_pk}/posts/
users_router = routers.NestedSimpleRouter(router, r'users', lookup='user')
users_router.register(r'posts', PostViewSet, basename='user-posts')


# 4. Final URL patterns list
urlpatterns = [
    # Custom registration endpoint
    path('register/', RegisterView.as_view(), name='register'),

    # Include all URLs from the main router
    path('', include(router.urls)),

    # Include all URLs from the nested posts router
    path('', include(posts_router.urls)),

    # Include all URLs from the nested users router
    path('', include(users_router.urls)),
]