import { DataQueue } from '../engine/DataQueue.js';

export interface NormalizedAddress {
  original: string;
  normalized: string;
  city: string;
  district: string;
  street: string;
  detail: string;
  poBox: string;
  isPOBox: boolean;
  confidenceScore: number;
  warnings: string[];
  lat?: number;
  lng?: number;
}

export class AddressNormalizer {
  // 模擬新舊行政區對應轉換
  private static cityMap: Record<string, string> = {
    '台北縣': '新北市',
    '桃園縣': '桃園市',
    '台中縣': '台中市',
    '台南縣': '台南市',
    '高雄縣': '高雄市',
  };

  /**
   * 即時地址解析 API
   * 包含：缺漏字元補全、模糊地址解析、行政區對應轉換、郵政信箱解析、地址格式自動切割
   */
  public static normalize(address: string): NormalizedAddress {
    let normalized = address.trim();
    let warnings: string[] = [];
    let confidenceScore = 100;

    // 1. 新舊門牌與行政區對應轉換
    for (const [oldCity, newCity] of Object.entries(this.cityMap)) {
      if (normalized.includes(oldCity)) {
        normalized = normalized.replace(oldCity, newCity);
        warnings.push(`Auto-corrected district/city from ${oldCity} to ${newCity}`);
        confidenceScore -= 10;
      }
    }

    // 2. 缺漏字元補全 (例如 "北市" -> "台北市")
    if (normalized.startsWith('北市')) {
      normalized = normalized.replace(/^北市/, '台北市');
      warnings.push('Auto-completed missing characters (北市 -> 台北市)');
      confidenceScore -= 5;
    } else if (normalized.startsWith('新北市') === false && normalized.startsWith('新北')) {
      normalized = normalized.replace(/^新北(?!市)/, '新北市');
      warnings.push('Auto-completed missing characters (新北 -> 新北市)');
      confidenceScore -= 5;
    }

    // 3. 郵政信箱特殊解析
    let poBox = '';
    let isPOBox = false;
    const poBoxRegex = /(?:郵政信箱|信箱|PO BOX|P\.O\. BOX)\s*(\d+|\w+)/i;
    const poBoxMatch = normalized.match(poBoxRegex);
    if (poBoxMatch) {
      poBox = poBoxMatch[1];
      isPOBox = true;
      normalized = normalized.replace(poBoxMatch[0], '').trim();
      warnings.push(`Extracted PO Box: ${poBox}`);
    }

    // 4. 地址格式自動切割 (City, District, Street, Detail)
    let city = '';
    let district = '';
    let street = '';
    let detail = '';

    const cityRegex = /^(.+?[市縣])/;
    const cityMatch = normalized.match(cityRegex);
    if (cityMatch) {
      city = cityMatch[1];
      normalized = normalized.replace(city, '').trim();
    }

    const districtRegex = /^(.+?[區鄉鎮市])/; // 鄉鎮市區
    const districtMatch = normalized.match(districtRegex);
    if (districtMatch) {
      district = districtMatch[1];
      normalized = normalized.replace(district, '').trim();
    }
    
    const streetRegex = /^(.+?[路街大道段])/; // 路、街、大道、段
    const streetMatch = normalized.match(streetRegex);
    if (streetMatch) {
      street = streetMatch[1];
      normalized = normalized.replace(street, '').trim();
    }

    detail = normalized;
    
    // 5. 模糊地址解析與標準化重組
    let finalNormalized = `${city}${district}${street}${detail}`;
    if (isPOBox) {
        finalNormalized += ` (郵政信箱 ${poBox})`;
    }

    return {
      original: address,
      normalized: finalNormalized,
      city,
      district,
      street,
      detail,
      poBox,
      isPOBox,
      confidenceScore,
      warnings
    };
  }

  /**
   * Geocode a given address to lat/lng coordinates (Mock Implementation)
   */
  public static async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const normal = this.normalize(address);
      // Simple mock heuristic logic based on city
      if (!normal.city) return null;
      
      // Base coords per city
      const mockMap: Record<string, {lat: number, lng: number}> = {
        '台北市': { lat: 25.032969, lng: 121.565418 },
        '新北市': { lat: 25.011985, lng: 121.464673 },
        '桃園市': { lat: 24.993510, lng: 121.300979 },
        '台中市': { lat: 24.147736, lng: 120.673648 },
        '台南市': { lat: 22.999899, lng: 120.226876 },
        '高雄市': { lat: 22.627278, lng: 120.301435 }
      };
      
      const base = mockMap[normal.city];
      if (!base) {
         // Random default for Taiwan roughly
         return {
           lat: 23.5 + Math.random() * 1.5,
           lng: 120.5 + Math.random() * 1.0
         };
      }
      
      // slight variation based on length to simulate different streets
      return {
         lat: base.lat + (address.length * 0.001),
         lng: base.lng + (address.length * 0.001)
      };
    } catch (error) {
      console.error(`[AddressNormalizer] Error geocoding address ${address}:`, error);
      throw error;
    }
  }

  /**
   * 批次大量校正 (Batch Normalization)
   */
  public static normalizeBatch(addresses: string[]): NormalizedAddress[] {
    return addresses.map(addr => this.normalize(addr));
  }
}
