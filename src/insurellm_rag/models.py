"""Pydantic models for chunks, retrieval results, and LLM structured outputs."""

from __future__ import annotations

from pydantic import BaseModel, Field


class Result(BaseModel):
    page_content: str
    metadata: dict


class Chunk(BaseModel):
    headline: str = Field(
        description="Brief heading most likely to match user queries",
    )
    summary: str = Field(
        description="A few sentences summarizing this chunk for common questions",
    )
    original_text: str = Field(
        description="Original text from the document, unchanged",
    )

    def as_result(self, document: dict) -> Result:
        metadata = {"source": document["source"], "type": document["type"]}
        content = f"{self.headline}\n\n{self.summary}\n\n{self.original_text}"
        return Result(page_content=content, metadata=metadata)


class Chunks(BaseModel):
    chunks: list[Chunk]


class RankOrder(BaseModel):
    order: list[int] = Field(
        description="Chunk ids ordered from most to least relevant (1-indexed)",
    )
