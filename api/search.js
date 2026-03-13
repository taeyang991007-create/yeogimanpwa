// Vercel Serverless Function — 네이버 검색 API 프록시
// 배포 후 /api/search?query=전주맛집 으로 호출됩니다

export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { query, display = 5 } = req.query;

  if (!query) {
    return res.status(400).json({ error: '검색어를 입력해주세요' });
  }

  // ⚠️ 여기에 본인의 네이버 API 키를 입력하세요!
  const CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.' });
  }

  try {
    const naverRes = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&sort=comment`,
      {
        headers: {
          'X-Naver-Client-Id': CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET,
        },
      }
    );

    const data = await naverRes.json();

    // 프랜차이즈 판별을 위한 키워드 목록
    const franchiseKeywords = [
      '스타벅스','맥도날드','버거킹','롯데리아','KFC','파리바게뜨','뚜레쥬르',
      'BBQ','BHC','교촌','네네','굽네','페리카나','호식이','투존',
      'CU','GS25','세븐일레븐','이마트24','미니스톱',
      '이디야','투썸플레이스','빽다방','메가커피','컴포즈커피',
      '올리브영','다이소','서브웨이','도미노','피자헛','미스터피자',
      '김밥천국','한솥','본죽','죠스떡볶이','신전떡볶이',
      '새마을식당','백종원','더본코리아','놀부','원할머니보쌈',
    ];

    // 네이버 응답을 여기에만 앱 형식으로 변환
    const items = (data.items || []).map(item => {
      const cleanName = item.title.replace(/<[^>]*>/g, ''); // HTML 태그 제거
      const isFranchise = franchiseKeywords.some(kw =>
        cleanName.includes(kw) || (item.category || '').includes('프랜차이즈')
      );

      return {
        name: cleanName,
        category: item.category || '',
        address: item.roadAddress || item.address || '',
        mapx: item.mapx,
        mapy: item.mapy,
        link: item.link || '',
        description: item.description || '',
        telephone: item.telephone || '',
        franchise: isFranchise,
      };
    });

    return res.status(200).json({
      total: data.total,
      items,
    });
  } catch (error) {
    return res.status(500).json({ error: '네이버 API 호출 실패: ' + error.message });
  }
}
