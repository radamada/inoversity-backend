export declare class CourseQueryDto {
    search?: string;
    category?: string;
    level?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
    page?: number;
    limit?: number;
}
