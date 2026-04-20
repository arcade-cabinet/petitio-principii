---
title: Agentic Workflows
updated: 2026-04-20
status: current
domain: technical
---

# Agentic Workflows

## Purpose
This document provides context for AI agents working on the Petitio Principii repository.

## Guiding Principles
1. **Challenge Assumptions:** Do not blindly implement standard text-adventure tropes. If a system can be made more absurd or more philosophically engaging, propose the change.
2. **Embrace the Stack:** We are using SolidJS for the UI and Phaser 4 for the rendering engine. Do not revert to React or standard DOM manipulation for the starfield.
3. **Content Expansion:** When tasked with adding new content, prefer sourcing from public domain absurdist literature over standard fantasy/sci-fi tropes. 
4. **Deterministic Chaos:** All random generation must be tied to the PRNG seed. If you add a new generator (e.g., a Markov chain for text), ensure it consumes the deterministic RNG so that seeds remain perfectly reproducible.
