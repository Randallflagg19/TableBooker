import { Controller, Get, Param } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { TablesService } from '../application/tables.service';

@ApiTags('Tables')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get(':id')
  @ApiParam({
    name: 'id',
    description: 'Table ID',
    example: '09f03102-558e-480e-883e-09353959b9d2',
  })
  public async findById(@Param('id') id: string) {
    return this.tablesService.findById(id);
  }
}
