"""
Python SDK for Awesome List Site Public API

This SDK provides a typed client for accessing the public API endpoints.

Example:
    from sdk_python import AwesomeListApiClient

    client = AwesomeListApiClient(os.getenv('API_KEY'))

    # List all resources
    result = client.get_resources()
    print(f"Total resources: {result['total']}")

    # Filter by category
    react_resources = client.get_resources(
        category='Frameworks',
        subcategory='React',
        limit=50
    )

    # Get single resource
    resource = client.get_resource(42)

    # Get categories and tags
    categories = client.get_categories()
    tags = client.get_tags()
"""

import os
import requests
from typing import Optional, Dict, Any, List, Generator
from datetime import datetime


# ============================================================================
# Custom Exceptions
# ============================================================================

class RateLimitError(Exception):
    """
    Exception raised when rate limit is exceeded.

    Attributes:
        message (str): Error message
        reset_time (datetime): When the rate limit resets
        remaining (int): Requests remaining in current window
        limit (int): Maximum requests per hour for this tier
    """

    def __init__(self, message: str, reset_time: datetime, remaining: int, limit: int):
        super().__init__(message)
        self.reset_time = reset_time
        self.remaining = remaining
        self.limit = limit


class ApiError(Exception):
    """
    Exception raised when API returns an error.

    Attributes:
        message (str): Error message
        status_code (int): HTTP status code
        status_text (str): HTTP status text
    """

    def __init__(self, message: str, status_code: int, status_text: str):
        super().__init__(message)
        self.status_code = status_code
        self.status_text = status_text


# ============================================================================
# API Client
# ============================================================================

class AwesomeListApiClient:
    """
    Client for the Awesome List Site Public API.

    Provides typed methods for all public endpoints with automatic
    rate limit handling, error handling, and request retries.

    Args:
        api_key (str): Your API key (get from /api/admin/api-keys)
        base_url (str): Base URL of the API (default: http://localhost:5000)

    Example:
        client = AwesomeListApiClient(api_key='your_key_here')
        resources = client.get_resources(category='Frameworks', limit=50)
    """

    def __init__(self, api_key: str, base_url: str = 'http://localhost:5000'):
        """
        Create a new API client.

        Args:
            api_key: Your API key
            base_url: Base URL of the API

        Raises:
            ValueError: If api_key is empty or None
        """
        if not api_key:
            raise ValueError('API key is required')

        self.api_key = api_key
        self.base_url = base_url.rstrip('/')  # Remove trailing slash

        # Create a session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Make an authenticated request to the API.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path (e.g., '/api/public/resources')
            **kwargs: Additional arguments to pass to requests

        Returns:
            Parsed JSON response as dictionary

        Raises:
            RateLimitError: When rate limit is exceeded
            ApiError: When API returns an error
        """
        url = f'{self.base_url}{endpoint}'

        response = self.session.request(method, url, **kwargs)

        # Handle rate limiting
        if response.status_code == 429:
            reset_header = response.headers.get('RateLimit-Reset')
            remaining_header = response.headers.get('RateLimit-Remaining')
            limit_header = response.headers.get('RateLimit-Limit')

            reset_time = (
                datetime.fromtimestamp(int(reset_header))
                if reset_header
                else datetime.fromtimestamp(datetime.now().timestamp() + 3600)
            )
            remaining = int(remaining_header) if remaining_header else 0
            limit = int(limit_header) if limit_header else 60

            raise RateLimitError(
                f'Rate limit exceeded. Resets at {reset_time.isoformat()}',
                reset_time,
                remaining,
                limit
            )

        # Handle other HTTP errors
        if not response.ok:
            error_message = f'HTTP {response.status_code}: {response.reason}'

            try:
                error_data = response.json()
                if 'message' in error_data:
                    error_message = error_data['message']
            except ValueError:
                # Response is not JSON, use default error message
                pass

            raise ApiError(error_message, response.status_code, response.reason)

        return response.json()

    def get_resources(
        self,
        page: int = 1,
        limit: int = 20,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List resources with optional filtering and pagination.

        Args:
            page: Page number (default: 1)
            limit: Items per page (default: 20, max: 100)
            category: Filter by category name
            subcategory: Filter by subcategory name
            search: Search in title and description

        Returns:
            Dictionary with keys: resources, total, page, limit, totalPages

        Example:
            # Get first page with default limit (20)
            page1 = client.get_resources()

            # Get specific page with custom limit
            page2 = client.get_resources(page=2, limit=50)

            # Filter by category
            frameworks = client.get_resources(category='Frameworks')

            # Filter by category and subcategory
            react = client.get_resources(
                category='Frameworks',
                subcategory='React'
            )

            # Search in title and description
            search_results = client.get_resources(search='hooks')

            # Combine filters
            filtered = client.get_resources(
                category='Frameworks',
                search='tutorial',
                page=1,
                limit=10
            )
        """
        params: Dict[str, Any] = {
            'page': page,
            'limit': limit,
        }

        if category:
            params['category'] = category
        if subcategory:
            params['subcategory'] = subcategory
        if search:
            params['search'] = search

        return self._request('GET', '/api/public/resources', params=params)

    def get_resource(self, resource_id: int) -> Dict[str, Any]:
        """
        Get a single resource by ID.

        Note: Only approved resources are accessible via the public API.
        Pending or rejected resources will return 404.

        Args:
            resource_id: Resource ID

        Returns:
            Single resource dictionary

        Raises:
            ApiError: With status 404 if resource not found or not approved

        Example:
            try:
                resource = client.get_resource(42)
                print(resource['title'])
            except ApiError as e:
                if e.status_code == 404:
                    print('Resource not found or not approved')
        """
        return self._request('GET', f'/api/public/resources/{resource_id}')

    def get_categories(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        List all categories with their subcategories.

        Returns:
            Dictionary with 'categories' key containing list of categories

        Example:
            result = client.get_categories()

            for category in result['categories']:
                print(f"{category['name']} ({category['slug']})")
                for sub in category.get('subcategories', []):
                    print(f"  - {sub['name']}")
        """
        return self._request('GET', '/api/public/categories')

    def get_tags(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        List all tags.

        Returns:
            Dictionary with 'tags' key containing list of tags

        Example:
            result = client.get_tags()
            print(f"Found {len(result['tags'])} tags")

            for tag in result['tags']:
                print(f"- {tag['name']}")
        """
        return self._request('GET', '/api/public/tags')

    def paginate_resources(
        self,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 20
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Generator that yields all resources across all pages.

        Automatically handles pagination and yields resources one by one.
        Useful for processing large datasets without loading everything into memory.

        Args:
            category: Filter by category name
            subcategory: Filter by subcategory name
            search: Search in title and description
            limit: Items per page (default: 20)

        Yields:
            Individual resource dictionaries

        Example:
            # Process all React resources one by one
            for resource in client.paginate_resources(
                category='Frameworks',
                subcategory='React'
            ):
                print(f"Processing: {resource['title']}")
                # Process each resource...
        """
        page = 1
        has_more = True

        while has_more:
            response = self.get_resources(
                page=page,
                limit=limit,
                category=category,
                subcategory=subcategory,
                search=search
            )

            for resource in response['resources']:
                yield resource

            has_more = page < response['totalPages']
            page += 1

    def get_all_resources(
        self,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch all resources across all pages.

        Warning: This loads all resources into memory. For large datasets,
        consider using paginate_resources() instead.

        Args:
            category: Filter by category name
            subcategory: Filter by subcategory name
            search: Search in title and description

        Returns:
            List of all matching resources

        Example:
            # Get all React resources (loads into memory)
            all_react_resources = client.get_all_resources(
                category='Frameworks',
                subcategory='React'
            )

            print(f"Found {len(all_react_resources)} resources")
        """
        resources = []

        for resource in self.paginate_resources(
            category=category,
            subcategory=subcategory,
            search=search
        ):
            resources.append(resource)

        return resources

    def close(self):
        """Close the HTTP session."""
        self.session.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


# ============================================================================
# Usage Examples
# ============================================================================

def example_1_basic_usage():
    """Example 1: Basic usage"""
    client = AwesomeListApiClient(os.getenv('API_KEY'))

    # Get first page of resources
    result = client.get_resources()
    print(f"Found {result['total']} resources across {result['totalPages']} pages")
    if result['resources']:
        print(f"First resource: {result['resources'][0]['title']}")


def example_2_filtering_and_pagination():
    """Example 2: Filtering and pagination"""
    client = AwesomeListApiClient(os.getenv('API_KEY'))

    # Get React resources with custom pagination
    react_resources = client.get_resources(
        category='Frameworks',
        subcategory='React',
        page=1,
        limit=50
    )

    print(f"Found {react_resources['total']} React resources")


def example_3_error_handling():
    """Example 3: Error handling with rate limits"""
    client = AwesomeListApiClient(os.getenv('API_KEY'))

    try:
        resources = client.get_resources()
        print(f"Success: {len(resources['resources'])} resources")
    except RateLimitError as e:
        print('Rate limit exceeded!')
        print(f"Resets at: {e.reset_time}")
        print(f"Remaining: {e.remaining}/{e.limit}")

        # Wait until reset time
        import time
        wait_time = (e.reset_time - datetime.now()).total_seconds()
        if wait_time > 0:
            print(f"Waiting {int(wait_time)}s...")
            time.sleep(wait_time)
            # Retry...
    except ApiError as e:
        print(f"API Error {e.status_code}: {e.message}")
    except Exception as e:
        print(f"Unexpected error: {e}")


def example_4_pagination_generator():
    """Example 4: Pagination with generator"""
    client = AwesomeListApiClient(os.getenv('API_KEY'))

    # Process all resources one by one (memory efficient)
    count = 0
    for resource in client.paginate_resources(category='Frameworks'):
        count += 1
        print(f"{count}. {resource['title']}")

        # Stop after 100 for demo purposes
        if count >= 100:
            break


def example_5_categories_and_tags():
    """Example 5: Get categories and tags"""
    client = AwesomeListApiClient(os.getenv('API_KEY'))

    # Get all categories
    categories_result = client.get_categories()
    print('Categories:')
    for cat in categories_result['categories']:
        print(f"- {cat['name']} ({cat['slug']})")

    # Get all tags
    tags_result = client.get_tags()
    print(f"\nFound {len(tags_result['tags'])} tags")


def example_6_context_manager():
    """Example 6: Using context manager"""
    with AwesomeListApiClient(os.getenv('API_KEY')) as client:
        resources = client.get_resources(limit=10)
        print(f"Found {len(resources['resources'])} resources")
    # Session automatically closed


if __name__ == '__main__':
    # Run examples
    print("=== Example 1: Basic Usage ===")
    example_1_basic_usage()

    print("\n=== Example 2: Filtering and Pagination ===")
    example_2_filtering_and_pagination()

    print("\n=== Example 3: Error Handling ===")
    example_3_error_handling()

    print("\n=== Example 4: Pagination Generator ===")
    example_4_pagination_generator()

    print("\n=== Example 5: Categories and Tags ===")
    example_5_categories_and_tags()

    print("\n=== Example 6: Context Manager ===")
    example_6_context_manager()
