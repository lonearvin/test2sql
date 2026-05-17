from typing import List, Optional, Tuple
import os
import requests
import uuid
import hashlib
from app.config.settings import settings

class VectorStore:
    def __init__(self):
        self.collection_name = "query_history"
        self.base_url = None
        self._init_client()

    def _init_client(self):
        chroma_host = getattr(settings, 'chroma_host', 'localhost')
        chroma_port = int(getattr(settings, 'chroma_port', 8000))
        chroma_use_remote = getattr(settings, 'chroma_use_remote', False)

        print(f"DEBUG: chroma_host={chroma_host}, chroma_port={chroma_port}, chroma_use_remote={chroma_use_remote}")

        if chroma_use_remote:
            self.base_url = f"http://{chroma_host}:{chroma_port}"
            try:
                response = requests.get(f"{self.base_url}/api/v2/heartbeat", timeout=5)
                if response.status_code == 200:
                    print(f"Connected to remote ChromaDB at {self.base_url}")
                else:
                    print(f"Failed to connect to ChromaDB: {response.status_code}")
                    self.base_url = None
            except Exception as e:
                print(f"Failed to connect to remote ChromaDB: {e}")
                self.base_url = None
        else:
            self.base_url = None
            print("Using local vector store (not available, ChromaDB requires SQLite 3.35.0+)")

    @property
    def is_available(self) -> bool:
        return self.base_url is not None

    def _ensure_collection(self):
        if not self.is_available:
            return None
        try:
            response = requests.post(
                f"{self.base_url}/api/v2/databases/text2sql",
                json={},
                timeout=5
            )
        except:
            pass
        try:
            response = requests.get(
                f"{self.base_url}/api/v2/collections/{self.collection_name}",
                timeout=5
            )
            if response.status_code == 200:
                return True
        except:
            pass
        try:
            response = requests.post(
                f"{self.base_url}/api/v2/collections",
                json={
                    "name": self.collection_name,
                    "metadata": {"description": "历史查询向量存储"}
                },
                timeout=5
            )
            if response.status_code in [200, 201]:
                return True
        except Exception as e:
            print(f"Failed to create collection: {e}")
        return False

    def add_query(
        self,
        query_id: str,
        question: str,
        sql: str,
        data_source_id: str,
        user_id: str
    ) -> None:
        if not self.is_available:
            print("Vector store not available, skipping add_query")
            return
        if not self._ensure_collection():
            print("Could not get/create collection, skipping add_query")
            return

        embedding = self._get_embedding(question)
        document = f"问题: {question}\nSQL: {sql}"
        metadata = {
            "question": question,
            "sql": sql,
            "data_source_id": data_source_id,
            "user_id": user_id
        }

        try:
            response = requests.post(
                f"{self.base_url}/api/v2/collections/{self.collection_name}/add",
                json={
                    "ids": [query_id],
                    "documents": [document],
                    "metadatas": [metadata],
                    "embeddings": [embedding]
                },
                timeout=10
            )
            if response.status_code not in [200, 201]:
                print(f"Failed to add query: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Failed to add query: {e}")

    def search_similar_queries(
        self,
        question: str,
        data_source_id: Optional[str] = None,
        limit: int = 3
    ) -> List[dict]:
        if not self.is_available:
            print("Vector store not available, returning empty list")
            return []
        if not self._ensure_collection():
            print("Could not get collection, returning empty list")
            return []

        query_embedding = self._get_embedding(question)

        try:
            response = requests.post(
                f"{self.base_url}/api/v2/collections/{self.collection_name}/query",
                json={
                    "query_embeddings": [query_embedding],
                    "n_results": limit,
                    "include": ["documents", "metadatas", "distances"]
                },
                timeout=10
            )

            if response.status_code != 200:
                print(f"Failed to search queries: {response.status_code}")
                return []

            results = response.json()
            similar_queries = []

            if results.get('ids') and len(results['ids']) > 0:
                for i, doc_id in enumerate(results['ids'][0]):
                    metadata = results['metadatas'][0][i]
                    distance = results['distances'][0][i]

                    if data_source_id and metadata.get('data_source_id') != data_source_id:
                        continue

                    similar_queries.append({
                        "id": doc_id,
                        "question": metadata.get("question", ""),
                        "sql": metadata.get("sql", ""),
                        "similarity_score": 1 - distance
                    })

            return similar_queries
        except Exception as e:
            print(f"Failed to search queries: {e}")
            return []

    def delete_query(self, query_id: str) -> None:
        if not self.is_available:
            return
        if not self._ensure_collection():
            return
        try:
            requests.post(
                f"{self.base_url}/api/v2/collections/{self.collection_name}/delete",
                json={"ids": [query_id]},
                timeout=5
            )
        except Exception as e:
            print(f"Failed to delete query: {e}")

    def clear_user_queries(self, user_id: str) -> None:
        if not self.is_available:
            return
        if not self._ensure_collection():
            return
        try:
            response = requests.post(
                f"{self.base_url}/api/v2/collections/{self.collection_name}/get",
                json={"include": ["metadatas"]},
                timeout=5
            )
            if response.status_code == 200:
                results = response.json()
                if results.get('ids'):
                    ids_to_delete = [
                        results['ids'][i]
                        for i, metadata in enumerate(results['metadatas'])
                        if metadata and metadata.get('user_id') == user_id
                    ]
                    if ids_to_delete:
                        requests.post(
                            f"{self.base_url}/api/v2/collections/{self.collection_name}/delete",
                            json={"ids": ids_to_delete},
                            timeout=5
                        )
        except Exception as e:
            print(f"Failed to clear user queries: {e}")

    def _get_embedding(self, text: str) -> List[float]:
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('all-MiniLM-L6-v2')
            embedding = model.encode(text).tolist()
            return embedding
        except Exception as e:
            print(f"Failed to get embedding: {e}")
            import numpy as np
            hash_val = int(hashlib.md5(text.encode()).hexdigest(), 16)
            np.random.seed(hash_val % (2**32))
            return np.random.randn(384).tolist()

vector_store = VectorStore()
