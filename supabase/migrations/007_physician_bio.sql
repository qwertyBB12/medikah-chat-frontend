-- Migration 007: Add bio column to physicians table
-- Phase 1: Profile Editing support

ALTER TABLE physicians ADD COLUMN IF NOT EXISTS bio TEXT;
