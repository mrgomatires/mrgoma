import { Float } from 'mssql';

import { getPool } from '@/connection/db';
import { logQuery } from '@/connection/queryLogger';
import { STOREFRONT_SELLABLE_WHERE } from '@/repositories/feedQuery';
import { logger } from '@/utils/logger';

/**
 * The seller dashboard's width → profile → rim selects.
 *
 * They offer the sizes the storefront sells, by the one sellable rule (052, D6).
 * They used to carry their own copy, `RemainingLife > '70%'` — a text
 * comparison (`'100%'` sorts below `'70%'`) with a threshold found nowhere
 * else — which hid 7 of the 294 sellable sizes on 2026-11-18.
 */
export type DimensionOption = {
  id: number;
  name: string | number;
};

/**
 * Fetch unique tire heights (Width in UI) from the database
 */
export async function fetchTireHeights(): Promise<DimensionOption[]> {
  try {
    const pool = await getPool();

    const query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY value) as id, 
        value as name
      FROM (
        SELECT DISTINCT 
          CASE 
            WHEN CHARINDEX('.', Height) > 0 AND LEN(SUBSTRING(Height, CHARINDEX('.', Height) + 1, LEN(Height))) = 1 
            THEN Height + '0' 
            ELSE Height 
          END as value
        FROM dbo.View_Tires
        WHERE 
          Height IS NOT NULL 
          AND Height != '' 
          AND TRY_CAST(Height AS float) IS NOT NULL
          AND ${STOREFRONT_SELLABLE_WHERE}
      ) AS UniqueHeights
      WHERE value IS NOT NULL
      ORDER BY TRY_CAST(value AS float)
    `;

    const result = await logQuery('dimensions.heights', () => pool.request().query(query));
    return result.recordset as DimensionOption[];
  } catch (error) {
    logger.error('Error fetching tire heights', error);
    return [];
  }
}

/**
 * Fetch unique tire widths (Sidewall in UI) from the database
 * Can be filtered by height if provided
 */
export async function fetchTireWidths(height?: number): Promise<DimensionOption[]> {
  try {
    const pool = await getPool();
    const request = pool.request();

    let whereClause = `
      Width IS NOT NULL 
      AND Width != '' 
      AND TRY_CAST(Width AS float) IS NOT NULL
      AND ${STOREFRONT_SELLABLE_WHERE}
    `;

    if (height !== undefined) {
      whereClause += ` AND (
        TRY_CAST(Height AS float) = @heightFloat 
        OR Height = @heightStr 
        OR Height = @heightStr2
      )`;
      request.input('heightFloat', Float, height);
      request.input('heightStr', height.toString());
      request.input('heightStr2', height.toString() + '.00');
    }

    const query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY value) as id,
        value as name
      FROM (
        SELECT DISTINCT 
          CASE 
            WHEN CHARINDEX('.', Width) > 0 AND LEN(SUBSTRING(Width, CHARINDEX('.', Width) + 1, LEN(Width))) = 1 
            THEN Width + '0' 
            ELSE Width 
          END as value
        FROM dbo.View_Tires
        WHERE ${whereClause}
      ) AS UniqueWidths
      WHERE value IS NOT NULL
      ORDER BY TRY_CAST(value AS float)
    `;

    const result = await logQuery('dimensions.widths', () => request.query(query), { height });
    return result.recordset as DimensionOption[];
  } catch (error) {
    logger.error('Error fetching tire widths', error);
    return [];
  }
}

/**
 * Fetch unique tire sizes (Diameter in UI) from the database
 * Can be filtered by height and width if provided
 */
export async function fetchTireSizes(height?: number, width?: number): Promise<DimensionOption[]> {
  try {
    const pool = await getPool();
    const request = pool.request();

    let whereClause = `
      Size IS NOT NULL 
      AND Size != '' 
      AND TRY_CAST(Size AS float) IS NOT NULL
      AND ${STOREFRONT_SELLABLE_WHERE}
    `;

    if (height !== undefined) {
      whereClause += ` AND (
        TRY_CAST(Height AS float) = @heightFloat 
        OR Height = @heightStr 
        OR Height = @heightStr2
      )`;
      request.input('heightFloat', Float, height);
      request.input('heightStr', height.toString());
      request.input('heightStr2', height.toString() + '.00');
    }

    if (width !== undefined) {
      whereClause += ` AND (
        TRY_CAST(Width AS float) = @widthFloat 
        OR Width = @widthStr 
        OR Width = @widthStr2
      )`;
      request.input('widthFloat', Float, width);
      request.input('widthStr', width.toString());
      request.input('widthStr2', width.toString() + '.00');
    }

    const query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY value) as id, 
        value as name
      FROM (
        SELECT DISTINCT 
          CASE 
            WHEN CHARINDEX('.', Size) > 0 AND LEN(SUBSTRING(Size, CHARINDEX('.', Size) + 1, LEN(Size))) = 1 
            THEN Size + '0' 
            ELSE Size 
          END as value
        FROM dbo.View_Tires
        WHERE ${whereClause}
      ) AS UniqueSizes
      WHERE value IS NOT NULL
      ORDER BY TRY_CAST(value AS float)
    `;

    const result = await logQuery('dimensions.sizes', () => request.query(query), {
      height,
      width,
    });
    return result.recordset as DimensionOption[];
  } catch (error) {
    logger.error('Error fetching tire sizes', error);
    return [];
  }
}
