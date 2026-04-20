# Content Generation System

## Overview
This document outlines the technical implementation for generating the game's textual content, moving away from static encyclopedic APIs to dynamic, surrealist text chaining.

## Architecture
1. **Source Corpus:**
   - Instead of live-fetching Wikipedia or Philosophy APIs, we will maintain a curated, local corpus of public domain surrealist texts.
   - These texts will be processed and tagged by grammatical function and rhetorical weight.

2. **Chaining Engine:**
   - A new module (`src/engine/content/ChainingEngine.ts`) will be responsible for stringing together fragments from the corpus.
   - It will use templates that enforce logical connectors: "Therefore", "It follows that", "Consider the case of...".

3. **Fallacy Integration:**
   - The `ArgumentGraph` will request specific types of chained arguments based on the current room's rhetorical type.
   - E.g., a "Circular" room will generate a chain where the conclusion is a direct, albeit obfuscated, restatement of the initial surreal premise.
