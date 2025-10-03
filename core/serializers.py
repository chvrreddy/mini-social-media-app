# core/serializers.py

from rest_framework import serializers
from .models import User, Post, Comment, Like, Follow

# Serializer for the User model, includes profile counts
class UserSerializer(serializers.ModelSerializer):
    followers_count = serializers.IntegerField(read_only=True)
    following_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'followers_count', 'following_count']

# Serializer for the Comment model
class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    post = serializers.PrimaryKeyRelatedField(read_only=True) # THIS IS THE FIX

    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'content', 'created_at']

# Serializer for the Post model, includes nested comments and like count
class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'author', 'content', 'created_at', 'likes_count', 'comments']
        
    def get_likes_count(self, obj):
        return obj.likes.count()

# Serializer for the Like model
class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ['id', 'post', 'user']

# Serializer for the Follow model
class FollowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following']