from fastapi import HTTPException, status

HTTP_404_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Resource not found",
)

HTTP_400_BAD_REQUEST = HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Bad request",
)

HTTP_500_INTERNAL_SERVER_ERROR = HTTPException(
    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    detail="Internal server error",
)


class AppException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)
